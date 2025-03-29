import React, { useEffect, useState } from 'react';

interface Move {
  id?: string;
  name: string;
  startup: string;
  type?: string;
  attribute?: string; // ← 追加
}

interface EnemyMove {
  id?: string;
  name: string;
  guard: string;
  startup?: string;
  type?: string;
  attribute?: string; // ← これを追加
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

const extractGuardValue = (move: EnemyMove): string => {
  if (move.attribute === '投') return '（投）'; // 投げ技なら固定表記
  const guard = move.guard?.trim();
  if (!guard) return '（-）'; // guardが空欄なら「（-）」と表示
  const match = guard.match(/^[-+]?\d+$/);
  return match ? `（ガード時${match[0]}）` : '（-）'; // 整数として妥当なら表示、そうでなければ「（-）」
};

const splitNameSmart = (name: string): [string, string] => {
  const bracketMatch = name.match(/^([\[【].*?[\]】])\s*(.*)/);
  if (bracketMatch) return [bracketMatch[1], bracketMatch[2]];

  const parenMatch = name.match(/^(.*?)(\s*\(.*\))$/);
  if (parenMatch) return [parenMatch[1], parenMatch[2]];

  const spaceIndex = name.indexOf(' ');
  if (spaceIndex > 0) return [name.slice(0, spaceIndex), name.slice(spaceIndex + 1)];

  const zspaceIndex = name.indexOf('　');
  if (zspaceIndex > 0) return [name.slice(0, zspaceIndex), name.slice(zspaceIndex + 1)];

  const mid = Math.floor(name.length / 2);
  return [name.slice(0, mid), name.slice(mid)];
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
  const [pinnedPlayerMoves, setPinnedPlayerMoves] = useState<string[]>([]);
  const [pinnedEnemyMoves, setPinnedEnemyMoves] = useState<string[]>([]);

  // 非表示関連
  const [hiddenPlayerMoves, setHiddenPlayerMoves] = useState<string[]>([]);
  const [hiddenEnemyMoves, setHiddenEnemyMoves] = useState<string[]>([]);
  const resetHiddenPlayerMoves = () => setHiddenPlayerMoves([]);
  const resetHiddenEnemyMoves = () => setHiddenEnemyMoves([]);

  useEffect(() => {
    fetch('/data/character_list.json')
      .then((res) => res.json())
      .then((data) => setCharacterList(data));
  }, []);

  useEffect(() => {
    fetch(`/data/${player}_moves.json`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((m: Move) => m.type !== '共通システム');
        const sorted = filtered.sort((a: Move, b: Move) => toValidStartup(a.startup) - toValidStartup(b.startup));
        setPlayerData({ name: player, moves: sorted });
        setPinnedPlayerMoves([]);
      });
  }, [player]);

  useEffect(() => {
    fetch(`/data/${opponent}_moves.json`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((m: EnemyMove) => m.type !== '共通システム');
        const sorted = filtered.sort((a: EnemyMove, b: EnemyMove) => toValidGuard(b.guard) - toValidGuard(a.guard));
        setOpponentData({ name: opponent, moves: sorted });
        setPinnedEnemyMoves([]);
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

  const formatPlayerMoveName = (move: Move) => {
    const startupValue = move.startup?.trim();
    const isThrow = move.attribute === '投'; // ★投げ判定
  
    const baseName = isThrow ? `${move.name} (投)` : move.name;
  
    if (startupValue && /^\d+$/.test(startupValue)) {
      return `${baseName} (${startupValue})`;
    }
    return baseName;
  };

  const getSortedPlayerMoves = (): Move[] => {
    if (!playerData) return [];
    return playerData.moves
      .filter((m) => !hiddenPlayerMoves.includes(m.name))
      .sort((a, b) => {
        const aPinned = pinnedPlayerMoves.includes(a.name);
        const bPinned = pinnedPlayerMoves.includes(b.name);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return toValidStartup(a.startup) - toValidStartup(b.startup);
      });
  };

  const getSortedEnemyMoves = (): EnemyMove[] => {
    if (!opponentData) return [];
    return opponentData.moves
      .filter((m) => !hiddenEnemyMoves.includes(m.name))
      .sort((a, b) => {
        const aPinned = pinnedEnemyMoves.includes(a.name);
        const bPinned = pinnedEnemyMoves.includes(b.name);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return toValidGuard(b.guard) - toValidGuard(a.guard);
      });
  };

  const togglePlayerPin = (name: string) => {
    setPinnedPlayerMoves(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleEnemyPin = (name: string) => {
    setPinnedEnemyMoves(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  // ★ startupが一致する技を抽出
  const getEnemyMovesMatchingStartup = (): EnemyMove[] => {
    if (!opponentData) return [];
    return opponentData.moves.filter((move) => {
      const startup = parseInt((move.startup || '').trim());
      return !isNaN(startup) && startup === opponentStartup;
    });
  };

  // 表示非表示関連
  const togglePlayerHide = (name: string) => {
    setHiddenPlayerMoves(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };
  
  const toggleEnemyHide = (name: string) => {
    setHiddenEnemyMoves(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
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

      {/* ★ startup一致技の表示 */}
      {opponentData && (
        <div style={{ marginTop: '1em' }}>
          <strong>相手の技で『発生{opponentStartup}F』になるもの:</strong>
          <ul>
            {getEnemyMovesMatchingStartup().map((move, index) => (
              <li key={index}>{move.name}{extractGuardValue(move)}</li>
            ))}
            {getEnemyMovesMatchingStartup().length === 0 && (
              <li>該当する技は見つかりませんでした。</li>
            )}
          </ul>
        </div>
      )}

      {viewMode === 'detail' && opponentData && (
        <div>
          <label>
            相手の技を選択:
            <select onChange={(e) => setSelectedEnemyMove(opponentData.moves.find((m) => m.name === e.target.value) || null)}>
              <option value="">--</option>
              {opponentData.moves.map((move, index) => (
                <option key={index} value={move.name}>{move.name}</option>
              ))}
            </select>
          </label>

          <table border={1}>
            <thead>
              <tr><th>技名</th><th>発生</th><th>判定</th></tr>
            </thead>
            <tbody>
              {getSortedPlayerMoves().map((move, index) => (
                <tr key={index}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatPlayerMoveName(move)}</td>
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
              {(hiddenPlayerMoves.length > 0 || hiddenEnemyMoves.length > 0) && (
              <div style={{ color: '#0497d1', marginTop: '0.5em' }}>
                ※ 非表示中の技があります（下部に表示）
              </div>
            )}
          <table border={1}>
            <thead>
              <tr>
                <th></th>
                {getSortedEnemyMoves().map((em, idx) => {
                  const [line1, line2] = splitNameSmart(em.name);
                  return (
                    <th key={idx} style={{ whiteSpace: 'nowrap' }}>
                      <div>{extractGuardValue(em)}</div>
                      <div style={{ fontSize: '0.6em' }}>{line1}</div>
                      <div style={{ fontSize: '0.6em' }}>{line2}</div>
                      <input
                        type="checkbox"
                        checked={pinnedEnemyMoves.includes(em.name)}
                        onChange={() => toggleEnemyPin(em.name)}
                        title="この技をピン留めする"
                      />
                      <input
                        type="checkbox"
                        checked={hiddenEnemyMoves.includes(em.name)}
                        onChange={() => toggleEnemyHide(em.name)}
                        title="この技を非表示にする"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {getSortedPlayerMoves().map((pm, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={pinnedPlayerMoves.includes(pm.name)}
                    onChange={() => togglePlayerPin(pm.name)}
                    title="この技をピン留めする"
                  />
                  <input
                    type="checkbox"
                    checked={hiddenPlayerMoves.includes(pm.name)}
                    onChange={() => togglePlayerHide(pm.name)}
                    title="この技を非表示にする"
                  />
                    {formatPlayerMoveName(pm)}
                  </td>
                  {getSortedEnemyMoves().map((em, j) => (
                    <td key={j}>{renderResult(pm.startup, em.guard, opponentStartup)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

           {/* 表示非表示 */}
        {(hiddenPlayerMoves.length > 0 || hiddenEnemyMoves.length > 0) && (
          <div style={{ marginTop: '1em' }}>
            {hiddenPlayerMoves.length > 0 && (
              <div>
                <h4>非表示中の自キャラ技（{hiddenPlayerMoves.length}）</h4>
                <button onClick={resetHiddenPlayerMoves}>すべて再表示</button>
                <ul>
                  {playerData.moves
                    .filter((m) => hiddenPlayerMoves.includes(m.name))
                    .map((move) => (
                      <li key={move.name}>
                        {formatPlayerMoveName(move)}{' '}
                        <button onClick={() => togglePlayerHide(move.name)}>再表示</button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {hiddenEnemyMoves.length > 0 && (
              <div>
                <h4>非表示中の相手技（{hiddenEnemyMoves.length}）</h4>
                <button onClick={resetHiddenEnemyMoves}>すべて再表示</button>
                <ul>
                  {opponentData.moves
                    .filter((m) => hiddenEnemyMoves.includes(m.name))
                    .map((move) => (
                      <li key={move.name}>
                        {move.name}（ガード時{move.guard}）{' '}
                        <button onClick={() => toggleEnemyHide(move.name)}>再表示</button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

          
        </div>
      )}

    </div>

  );
};

export default MatchupChecker;
