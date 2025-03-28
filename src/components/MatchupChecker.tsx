import React, { useEffect, useState } from 'react';

interface Move {
  id?: string;
  name: string;
  startup: string;
}

interface EnemyMove {
  id?: string;
  name: string;
  guard: string;
}

interface CharacterData {
  name: string;
  moves: Move[];
}

interface EnemyData {
  name: string;
  moves: EnemyMove[];
}

const toValidStartup = (s: string): number => {
  return /^\d+$/.test(s.trim()) ? parseInt(s.trim()) : Number.MAX_SAFE_INTEGER;
};

const toValidGuard = (s: string): number => {
  return /^[-+]?\d+$/.test(s.trim()) ? parseInt(s.trim()) : Number.MIN_SAFE_INTEGER;
};

const MatchupChecker: React.FC = () => {
  const [characterList, setCharacterList] = useState<{ [key: string]: { name_jp: string; url: string } }>({});
  const [player, setPlayer] = useState<string>('ken');
  const [opponent, setOpponent] = useState<string>('ryu');
  const [playerData, setPlayerData] = useState<CharacterData | null>(null);
  const [opponentData, setOpponentData] = useState<EnemyData | null>(null);
  const [selectedEnemyMove, setSelectedEnemyMove] = useState<EnemyMove | null>(null);
  const [opponentStartup, setOpponentStartup] = useState<number>(4);
  const [viewMode, setViewMode] = useState<'detail' | 'matrix'>('detail');

  useEffect(() => {
    fetch('/data/character_list.json')
      .then((res) => res.json())
      .then((data) => setCharacterList(data));
  }, []);

  useEffect(() => {
    fetch(`/data/${player}_moves.json`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.sort((a: Move, b: Move) => toValidStartup(a.startup) - toValidStartup(b.startup));
        setPlayerData({ name: player, moves: sorted });
      });
  }, [player]);

  useEffect(() => {
    fetch(`/data/${opponent}_moves.json`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.sort((a: EnemyMove, b: EnemyMove) => toValidGuard(b.guard) - toValidGuard(a.guard));
        setOpponentData({ name: opponent, moves: sorted });
      });
  }, [opponent]);

  const renderResult = (startup: string, advantage: string, opponent: number): string => {
    const s = parseInt(startup);
    const a = parseInt(advantage);
    if (isNaN(s) || isNaN(a)) return '-';
    const diff = opponent - a;
    if (s < diff) return '〇';
    if (s === diff) return '△';
    return '×';
  };

  const formatEnemyMoveName = (move: EnemyMove) => {
    const guardValue = move.guard?.trim();
    if (guardValue && /^[-+]?\d+$/.test(guardValue)) {
      return `${move.name} (${guardValue})`;
    }
    return move.name;
  };

  const formatPlayerMoveName = (move: Move) => {
    const startupValue = move.startup?.trim();
    if (startupValue && /^\d+$/.test(startupValue)) {
      return `${move.name} (${startupValue})`;
    }
    return move.name;
  };

  return (
    <div>
      <h2>Matchup Checker</h2>

      <div>
        <label>自キャラ:
          <select value={player} onChange={(e) => setPlayer(e.target.value)}>
            {Object.keys(characterList).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>

        <label>相手キャラ:
          <select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
            {Object.keys(characterList).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>

        <label>
          表示モード:
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'detail' | 'matrix')}>
            <option value="detail">個別技</option>
            <option value="matrix">判定マトリクス</option>
          </select>
        </label>

        <label>
          相手の次の技の発生:
          <input type="number" value={opponentStartup} onChange={(e) => setOpponentStartup(parseInt(e.target.value))} />F
        </label>
      </div>

      {viewMode === 'detail' && opponentData && (
        <div>
          <label>
            相手の技を選択:
            <select onChange={(e) => setSelectedEnemyMove(opponentData.moves.find((m) => m.name === e.target.value) || null)}>
              <option value="">--</option>
              {opponentData.moves.map((move, index) => (
                <option key={index} value={move.name}>{formatEnemyMoveName(move)}</option>
              ))}
            </select>
          </label>

          <table border={1}>
            <thead>
              <tr><th>技名</th><th>発生</th><th>判定</th></tr>
            </thead>
            <tbody>
              {playerData?.moves.map((move, index) => (
                <tr key={index}>
                  <td>{formatPlayerMoveName(move)}</td>
                  <td>{move.startup}</td>
                  <td>{selectedEnemyMove ? renderResult(move.startup, selectedEnemyMove.guard, opponentStartup) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'matrix' && playerData && opponentData && (
        <div>
          <table border={1}>
            <thead>
              <tr>
                <th></th>
                {opponentData.moves.map((em, idx) => (
                  <th key={idx}>{formatEnemyMoveName(em)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerData.moves.map((pm, idx) => (
                <tr key={idx}>
                  <td>{formatPlayerMoveName(pm)}</td>
                  {opponentData.moves.map((em, j) => (
                    <td key={j}>{renderResult(pm.startup, em.guard, opponentStartup)}</td>
                  ))}
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
