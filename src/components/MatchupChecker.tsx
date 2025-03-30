import React, { useEffect, useState } from 'react';

interface Move {
  id?: string;
  name: string;
  startup: string;
  type?: string;
  attribute?: string;
}

interface EnemyMove {
  id?: string;
  name: string;
  guard: string;
  startup?: string;
  type?: string;
  attribute?: string;
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

const extractGuardValue = (move: EnemyMove) => {
  
  if (move.attribute === '投') {
    return <span>（<span className="font-bold">投</span>）</span>;
  }

  const guard = move.guard?.trim();
  if (!guard) return <span>（-）</span>;

  const match = guard.match(/^[-+]?\d+$/);
  if (match) {
    return (
      <span>
        （<span className="font-bold">ガード時{match[0]}</span>）
      </span>
    );
  }

  return <span>（-）</span>;
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
  const [hiddenPlayerMoves, setHiddenPlayerMoves] = useState<string[]>([]);
  const [hiddenEnemyMoves, setHiddenEnemyMoves] = useState<string[]>([]);

  const resetHiddenPlayerMoves = () => setHiddenPlayerMoves([]);
  const resetHiddenEnemyMoves = () => setHiddenEnemyMoves([]);

  const [playerStartupMin, setPlayerStartupMin] = useState<number | null>(null);
  const [playerStartupMax, setPlayerStartupMax] = useState<number | null>(null);

  const [enemyGuardMin, setEnemyGuardMin] = useState<number | null>(null);
  const [enemyGuardMax, setEnemyGuardMax] = useState<number | null>(null);

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
    const isThrow = move.attribute === '投';
    const baseName = isThrow ? `${move.name} (投)` : move.name;
    if (startupValue && /^\d+$/.test(startupValue)) {
      return `${baseName} (${startupValue})`;
    }
    return baseName;
  };

  const getSortedPlayerMoves = (): Move[] => {
    if (!playerData) return [];
    return playerData.moves
      .filter((m) => {
        const val = toValidStartup(m.startup);
        return (
          !hiddenPlayerMoves.includes(m.name) &&
          (playerStartupMin === null || val >= playerStartupMin) &&
          (playerStartupMax === null || val <= playerStartupMax)
        );
      })
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
      .filter((m) => {
        const val = toValidGuard(m.guard || '');
        return (
          !hiddenEnemyMoves.includes(m.name) &&
          (enemyGuardMin === null || val >= enemyGuardMin) &&
          (enemyGuardMax === null || val <= enemyGuardMax)
        );
      })
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

  const getEnemyMovesMatchingStartup = (): EnemyMove[] => {
    if (!opponentData) return [];
    return opponentData.moves.filter((move) => {
      const startup = parseInt((move.startup || '').trim());
      return !isNaN(startup) && startup === opponentStartup;
    });
  };

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
    <div className="p-4 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Matchup Checker</h2>

      <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="ml-auto p-2 text-sm border rounded bg-gray-200 dark:bg-gray-600 dark:text-white"
        >
          ダークモード切替
        </button>

      <div className="flex flex-wrap gap-4 items-end mb-6">
        <label className="flex flex-col text-sm">
          自キャラ
          <select value={player} onChange={(e) => setPlayer(e.target.value)} className="mt-1 p-1 rounded bg-white dark:bg-gray-700">
            {Object.keys(characterList).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          相手キャラ
          <select value={opponent} onChange={(e) => setOpponent(e.target.value)} className="mt-1 p-1 rounded bg-white dark:bg-gray-700">
            {Object.keys(characterList).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          表示モード
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'detail' | 'matrix')} className="mt-1 p-1 rounded bg-white dark:bg-gray-700">
            <option value="detail">個別技</option>
            <option value="matrix">判定マトリクス</option>
          </select>
        </label>

        <label className="flex flex-col text-sm">
          相手の次の技の発生
          <input type="number" value={opponentStartup} onChange={(e) => setOpponentStartup(parseInt(e.target.value))} className="mt-1 p-1 rounded bg-white dark:bg-gray-700 w-24" />
        </label>

       
      </div>

      <div className="flex gap-4 items-end text-sm mb-4">
      
      <div className="flex gap-4 items-end text-sm">
      
      <div>
        <label>自キャラ発生:</label>
        <div className="flex gap-1">
          <input type="number" placeholder="最小" className="w-16 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
          onChange={(e) => setPlayerStartupMin(e.target.value ? parseInt(e.target.value) : null)} />
          <input type="number" placeholder="最大" className="w-16 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
          onChange={(e) => setPlayerStartupMax(e.target.value ? parseInt(e.target.value) : null)} />
        </div>
      </div>

      <div>
        <label>相手ガード時:</label>
        <div className="flex gap-1">
          <input type="number" placeholder="最小" className="w-16 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
          onChange={(e) => setEnemyGuardMin(e.target.value ? parseInt(e.target.value) : null)} />
          <input type="number" placeholder="最大" className="w-16 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
          onChange={(e) => setEnemyGuardMax(e.target.value ? parseInt(e.target.value) : null)} />
        </div>
      </div>
    </div>
    </div>
    
    




      <div className="mb-6">
    <h3 className="text-lg font-semibold mb-2">発生 {opponentStartup}f の相手技一覧</h3>
    <ul className="list-disc pl-5 text-sm">
      {getEnemyMovesMatchingStartup().length > 0 ? (
        getEnemyMovesMatchingStartup().map((move, idx) => {
          const [main, sub] = splitNameSmart(move.name);
          const isThrow = move.attribute === '投';
          const startup = move.startup?.trim();
          const hasValidStartup = /^\d+$/.test(startup || '');
          const suffix = isThrow
            ? '（投）'
            : move.guard?.trim()
            ? `（ガード時${move.guard.trim()}）`
            : '（-）';

          return (
            <li key={idx}>
              {main}
              {sub && ` ${sub}`} {suffix}
              {hasValidStartup && ` (${startup})`}
            </li>
          );
        })
      ) : (
        <li>該当する技は見つかりませんでした。</li>
      )}
    </ul>
  </div>

      

      {viewMode === 'detail' && opponentData && (
        
        <div className="overflow-x-auto bg-gray-900">
          <label className="block mb-2 text-sm">
            相手の技を選択:
            <select onChange={(e) => setSelectedEnemyMove(opponentData.moves.find((m) => m.name === e.target.value) || null)} className="ml-2 p-1 rounded bg-white dark:bg-gray-700">
              <option value="">--</option>
              {opponentData.moves.map((move, index) => (
                <option key={index} value={move.name}>{move.name}</option>
              ))}
            </select>
          </label>

          <table className="table-auto w-full border-collapse border border-gray-400 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="border border-gray-400 dark:border-gray-600 px-2 py-1">技名</th>
                <th className="border border-gray-400 dark:border-gray-600 px-2 py-1">発生</th>
                <th className="border border-gray-400 dark:border-gray-600 px-2 py-1">判定</th>
              </tr>
            </thead>
            <tbody>
              {getSortedPlayerMoves().map((move, index) => (
                <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800">
                  <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 whitespace-nowrap">{formatPlayerMoveName(move)}</td>
                  <td className="border border-gray-400 dark:border-gray-600 px-2 py-1">{move.startup}</td>
                  <td className="border border-gray-400 dark:border-gray-600 px-2 py-1">{selectedEnemyMove ? renderResult(move.startup, selectedEnemyMove.guard, opponentStartup) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

{viewMode === 'matrix' && playerData && opponentData && (
  <div className="overflow-x-auto bg-gray-100 dark:bg-gray-900">
    {(hiddenPlayerMoves.length > 0 || hiddenEnemyMoves.length > 0) && (
      <div className="mb-4 text-sm text-white-700 bg-gray-50 dark:bg-gray-700 p-2 rounded">
        非表示中の技があります(表の下に表示)
      </div>
    )}

    

    <table className="table-auto min-w-[1000px] border-collapse border border-gray-400 dark:border-gray-600">
      <thead>
        <tr className="bg-gray-200 dark:bg-gray-700">
          <th className="border px-2 py-1 min-w-[8rem] text-sm">技名</th>
          {getSortedEnemyMoves().map((em, idx) => {
            const [line1, line2] = splitNameSmart(em.name);
            const guardValue = toValidGuard(em.guard || '');
            let bgColorClass = 'bg-gray-200 dark:bg-gray-700'; // デフォルト

            if (guardValue > 0) {
              bgColorClass = 'bg-red-800 text-white'; // 危険技（+）
            } else if (guardValue <= -4) {
              bgColorClass = 'bg-green-800 text-white'; // 確反あり技（-4以下）
            } else if (guardValue < 0) {
              bgColorClass = 'bg-blue-800 text-white'; // 安全技（-1 ～ -3）
            }

            return (
              <th
                key={idx}
                className={`border px-2 py-1 text-xs break-words whitespace-normal min-w-[6rem] ${bgColorClass}`}
              >
                <div>{extractGuardValue(em)}</div>
                <div>{line1}</div>
                <div>{line2}</div>
                <div className="flex gap-1 justify-center mt-1 text-xs">
                  <label>
                    <input
                      type="checkbox"
                      checked={pinnedEnemyMoves.includes(em.name)}
                      onChange={() => toggleEnemyPin(em.name)}
                    />
                    ☑
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={hiddenEnemyMoves.includes(em.name)}
                      onChange={() => toggleEnemyHide(em.name)}
                    />
                    ×
                  </label>
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {getSortedPlayerMoves().map((pm, idx) => (
          <tr key={idx} className="even:bg-gray-50 dark:even:bg-gray-800">
            <td className="border px-2 py-1 text-sm whitespace-nowrap min-w-[8rem]">
              {formatPlayerMoveName(pm)}
              <div className="flex gap-2 mt-1 text-xs">
                <label>
                  <input
                    type="checkbox"
                    checked={pinnedPlayerMoves.includes(pm.name)}
                    onChange={() => togglePlayerPin(pm.name)}
                  />
                  ピン
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={hiddenPlayerMoves.includes(pm.name)}
                    onChange={() => togglePlayerHide(pm.name)}
                  />
                  非表示
                </label>
              </div>
            </td>
            {getSortedEnemyMoves().map((em, j) => (
              <td key={j} className="border px-2 py-1 text-center min-w-[6rem]">
                {renderResult(pm.startup, em.guard, opponentStartup)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>

    
    <div className="flex gap-2 mt-2 text-sm">
      <button
        onClick={resetHiddenPlayerMoves}
        className="px-2 py-1 bg-gray-500 text-white rounded"
      >
        自キャラの非表示技をリセット
      </button>
      <button
        onClick={resetHiddenEnemyMoves}
        className="px-2 py-1 bg-gray-500 text-white rounded"
      >
        相手キャラの非表示技をリセット
      </button>
    </div>

    {hiddenPlayerMoves.length > 0 && (
      <div className="mb-2 text-sm">
        <div className="font-semibold">非表示中の技（自キャラ）:</div>
        <ul className="list-disc pl-5">
          {hiddenPlayerMoves.map((name, i) => (
            <li key={i}>
              {name}{' '}
              <button onClick={() => togglePlayerHide(name)} className="ml-2 text-blue-600 underline">
                再表示
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}

    


    {hiddenEnemyMoves.length > 0 && (
      <div className="mb-4 text-sm">
        <div className="font-semibold">非表示中の技（相手キャラ）:</div>
        <ul className="list-disc pl-5">
          {hiddenEnemyMoves.map((name, i) => (
            <li key={i}>
              {name}{' '}
              <button onClick={() => toggleEnemyHide(name)} className="ml-2 text-blue-600 underline">
                再表示
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}

    
  </div>
  
)}


    </div>
  );
};

export default MatchupChecker;