import { useEffect, useState } from 'react';

interface Move {
  id: string;
  name: string;
  startup: number;
}

interface EnemyMove {
  id: string;
  name: string;
  guardAdvantage: number;
}

interface CharacterData {
  name: string;
  moves: Move[];
}

interface EnemyData {
  name: string;
  moves: EnemyMove[];
}

const MatchupChecker: React.FC = () => {
  const [kenData, setKenData] = useState<CharacterData | null>(null);
  const [ryuData, setRyuData] = useState<EnemyData | null>(null);
  const [selectedEnemyMove, setSelectedEnemyMove] = useState<EnemyMove | null>(null);
  const [opponentStartup, setOpponentStartup] = useState<number>(4);

  useEffect(() => {
    fetch('/data/ken.json').then(res => res.json()).then(setKenData);
    fetch('/data/ryu.json').then(res => res.json()).then(setRyuData);
  }, []);

  const renderResult = (kenMove: Move, guardAdvantage: number, opponentStartup: number) => {
    const effectiveFrame = opponentStartup - guardAdvantage;
    if (kenMove.startup < effectiveFrame) return '〇 勝ち';
    if (kenMove.startup === effectiveFrame) return '△ 相打ち';
    return '× 負け';
  };

  return (
    <div>
      <h2>Advantage Moves Calculator - Prototype</h2>

      <div style={{ marginBottom: '1em' }}>
        <label>{ryuData?.name ?? '相手キャラ'}の技を選択: </label>
        
        <select
          onChange={(e) => {
            const move = ryuData?.moves.find(m => m.id === e.target.value);
            setSelectedEnemyMove(move || null);
          }}
          
        >
            
        
          <option value="">-- 選択してください --</option>
          {ryuData?.moves.map(move => (
            <option key={move.id} value={move.id}>
              {move.name}（ガード{move.guardAdvantage >= 0 ? '+' : ''}{move.guardAdvantage}）
            </option>
          ))}
        </select>
      </div>

    <p style={{ fontSize: '0.9em', marginTop: '-0.5em', marginBottom: '1em', color: '#555' }}>
        ※ ガード値の意味：マイナス → {ryuData?.name ?? '相手キャラ'}が不利 ／ プラス → 有利
    </p>

      {selectedEnemyMove && (
        <div style={{ marginBottom: '1em' }}>
          <label>
            {ryuData?.name ?? '相手キャラ'}が、{kenData?.name ?? 'こちら'}がガード後に振る技の発生フレーム:
          </label>
          <select
            value={opponentStartup}
            onChange={(e) => setOpponentStartup(parseInt(e.target.value))}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map(f => (
              <option key={f} value={f}>{f}f</option>
            ))}
          </select>
        </div>
      )}

      {selectedEnemyMove && kenData && (
        <div>
          <h3>■ 対{ryuData?.name} {selectedEnemyMove.name}（ガード{selectedEnemyMove.guardAdvantage >= 0 ? '+' : ''}{selectedEnemyMove.guardAdvantage}）</h3>
          <p>
            → 相手が<strong>{selectedEnemyMove.name}</strong>後に <strong>{opponentStartup}f技</strong> を振ったと仮定して判定
          </p>

          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', paddingRight: '1em' }}>ケンの技</th>
                <th style={{ borderBottom: '1px solid #ccc', paddingRight: '1em' }}>発生</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>判定</th>
              </tr>
            </thead>
            <tbody>
              {kenData.moves.map(move => (
                <tr key={move.id}>
                  <td style={{ paddingRight: '1em' }}>{move.name}</td>
                  <td style={{ paddingRight: '1em' }}>{move.startup}f</td>
                  <td>{renderResult(move, selectedEnemyMove.guardAdvantage, opponentStartup)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MatchupChecker;
