import React, { useEffect, useState } from 'react';
//pushテスト
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

interface SplitEnemyMoveInfo {
  baseName: string;
  worstName: string;
  worstGuard: string;
  bestName: string;
  bestGuard: string;
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
  //const [selectedEnemyMove, setSelectedEnemyMove] = useState<EnemyMove | null>(null);
  const [opponentStartup, setOpponentStartup] = useState<number>(4);
  //const [viewMode, setViewMode] = useState<'detail' | 'matrix'>('detail');
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

  // 絞り込み対象の技名（nullなら全表示）
  const [focusedPlayerMove, setFocusedPlayerMove] = useState<string | null>(null);
  const [focusedEnemyMove, setFocusedEnemyMove] = useState<string | null>(null);

  // 文字列絞り込み
  const [playerMoveNameFilter, setPlayerMoveNameFilter] = useState<string>('');
  const [enemyMoveNameFilter, setEnemyMoveNameFilter] = useState<string>('');

  // 最悪最良注意書き用
  //const [splitEnemyMoveNames, setSplitEnemyMoveNames] = useState<string[]>([]);
  const [showSplitInfo, setShowSplitInfo] = useState<boolean>(false);

  // 説明書開閉
  const [showHelp, setShowHelp] = useState(false);
  //免責事項
  //const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [splitEnemyMoveInfos, setSplitEnemyMoveInfos] = useState<SplitEnemyMoveInfo[]>([]);


  //const splitNamesTemp: string[] = [];

  const expandEnemyMoves = (
    moves: EnemyMove[],
    recordSplitInfos: (infos: SplitEnemyMoveInfo[]) => void
  ): EnemyMove[] => {
    const expanded: EnemyMove[] = [];
    const splitInfos: SplitEnemyMoveInfo[] = [];
  
    moves.forEach((move) => {
      const guard = move.guard?.trim() || '';
      const rangeMatch = guard.match(/^([+-]?\d+)～([+-]?\d+)$/);
  
      if (rangeMatch) {
        const [_, min, max] = rangeMatch;
        const baseName = move.name;
  
        const worst = { ...move, name: `${baseName}（最悪）`, guard: max };
        const best = { ...move, name: `${baseName}（最良）`, guard: min };
  
        expanded.push(best);
        expanded.push(worst);
  
        splitInfos.push({
          baseName,
          worstName: worst.name,
          worstGuard: worst.guard || '-',
          bestName: best.name,
          bestGuard: best.guard || '-',
        });
      } else {
        expanded.push(move);
      }
    });
  
    recordSplitInfos(splitInfos);
    return expanded;
  };
  
  //ダークモードデフォルト
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/character_list.json`)
      .then((res) => res.json())
      .then((data) => setCharacterList(data));
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/${player}_moves.json`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((m: Move) => m.type !== '共通システム');
        const sorted = filtered.sort((a: Move, b: Move) => toValidStartup(a.startup) - toValidStartup(b.startup));
        setPlayerData({ name: player, moves: sorted });
        setPinnedPlayerMoves([]);
      });
  }, [player]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/${opponent}_moves.json`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((m: EnemyMove) => m.type !== '共通システム');
        const expanded = expandEnemyMoves(filtered, setSplitEnemyMoveInfos);
  
        const sorted = expanded.sort((a, b) => toValidGuard(b.guard) - toValidGuard(a.guard));
        setOpponentData({ name: opponent, moves: sorted });
        setPinnedEnemyMoves([]);
      });
  }, [opponent]);

  const renderResult = (startup: string, advantage: string, opponent: number): string => {
    const s = parseInt(startup);
    const a = parseInt(advantage);
    if (isNaN(s) || isNaN(a)) return '-';
  
    const diff = opponent - a;       // 技をガードしてから相手が動けるまでのフレーム
    const margin = diff - s;         // 自キャラ技が間に合うまでの余裕
  
    let resultSymbol = '';
    if (margin > 0) resultSymbol = '〇';
    else if (margin === 0) resultSymbol = '△';
    else resultSymbol = '×';
  
    return `${resultSymbol}(${margin})`;
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
        if (focusedPlayerMove && m.name !== focusedPlayerMove) return false; // ←追加
        if (playerMoveNameFilter && !m.name.includes(playerMoveNameFilter)) return false;
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
        if (focusedEnemyMove && m.name !== focusedEnemyMove) return false; // ←追加
        if (enemyMoveNameFilter && !m.name.includes(enemyMoveNameFilter)) return false;
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
      <h2 className="text-2xl font-bold mb-4">Matchup Checker(非公式スト6ガード硬直差考察アプリ)</h2>

      <div className="mb-4">
       
          <div className="mt-2 p-3 bg-red-100 dark:bg-gray-800 text-sm rounded leading-relaxed text-white-800 dark:text-white-300">
            <p>このツールは個人が制作したものであり、正確性や完全性を保証するものではありません。</p>
            <p>掲載されたデータや判定結果に基づく損害や不利益に対して、製作者は一切の責任を負いません。</p>
            <p>あくまで参考用途としてご利用ください。</p>
            <p>ご意見ご感想、誤記載の報告などありましたら以下まで御連絡ください。</p>
            <p>
              制作者、連絡先: ネコ缶
              <a href="https://x.com/nekokan" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                https://x.com/nekokan
              </a>
            </p>
          </div>
        
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowHelp((prev) => !prev)}
          className="text-sm bg-gray-600 text-white px-3 py-1 rounded"
        >
          {showHelp ? '▲ 使い方を隠す' : '▼ 使い方を見る'}
        </button>

        {showHelp && (
          <div className="mt-2 p-3 bg-blue-100 dark:bg-gray-800 text-sm rounded leading-relaxed">
            <p>このツールは、自キャラの技と相手キャラのガード時フレーム差から、</p>
            <p>ガード後に出す自分の技の勝ち負けを判定します</p>
            <p>相手の何らかの技をガードしたときに通常技を出すべきかの判断にお使いください。</p>
            <ul className="list-disc pl-5 mt-2">
              <li>便利な使い方や詳細は以下のURLをチェックしてください</li>
              <li>
                <a href="https://note.com/nekocompany/n/nb8452c09b42b" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                  https://note.com/nekocompany/n/nb8452c09b42b
                </a>
              </li>
              <li>「自キャラ」「相手キャラ」を選択してください。</li>
              <li>横列:相手の技一覧。これらをガードした後どうするかを考察します(自分の硬直fが大きいものが左)</li>
              <li>縦列:自分の技一覧(発生の早いものが上)</li>
              <li>「相手の次の技の発生」には、相手の技一覧の技をガード後に出す技の発生フレームを入力します。</li>
              <li>表は、「自キャラ技 × 相手の次の技」の勝ち負け（〇勝ち/△相打ち/×負け）を表示します。</li>
              <li>フィルターやピン留め、非表示などで技を整理できます。</li>
              <li>硬直差毎に色分けしています。</li>
              <li>赤:ガードしたとき自分の不利フレームが大きい技。基本的に動けません</li>
              <li>グレー:±ゼロ。つまり互いに4fを出せば相打ちになります</li>
              <li>青:ガードしたとき相手の不利フレームが大きい技。こちらが速い技を出せば、相手が技を出していれば勝ちます</li>
              <li>緑:相手の不利フレーム-4以下の技。つまり確反があるという事です。</li>
              <li>△(0)この数字は自分の技と相手の次の技の差し引きです。</li>
              <li>△(0)なら互いに理論値で出せば相打ち、〇(1)なら理論上勝てるが猶予は1f、×(-1)なら理論上勝てないが相手が遅れれば或いは、〇(5)ならかなり余裕を持って勝てます。</li>
              
            </ul>
          </div>
        )}
      </div>

      

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
        <label>ガード硬直差:</label>
        <div className="flex gap-1">
          <input type="number" placeholder="最小" className="w-16 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
          onChange={(e) => setEnemyGuardMin(e.target.value ? parseInt(e.target.value) : null)} />
          <input type="number" placeholder="最大" className="w-16 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
          onChange={(e) => setEnemyGuardMax(e.target.value ? parseInt(e.target.value) : null)} />
        </div>
      </div>
    </div>
    </div>
    
    <div className="flex gap-4 items-end text-sm mb-4">
      <div>
        <label>自キャラ技名フィルタ:</label>
        <input
          type="text"
          value={playerMoveNameFilter}
          onChange={(e) => setPlayerMoveNameFilter(e.target.value)}
          className="w-40 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label>相手キャラ技名フィルタ:</label>
        <input
          type="text"
          value={enemyMoveNameFilter}
          onChange={(e) => setEnemyMoveNameFilter(e.target.value)}
          className="w-40 p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
        />
      </div>
    </div>
    
    {splitEnemyMoveInfos.length > 0 && (
      <div className="mb-4 text-sm text-gray-400 bg-yellow-100 dark:bg-gray-700 p-2 rounded">
        <div className="flex justify-between items-center">
          <div className="font-bold">
            以下の技は有利フレームに幅があるため、最悪/最良に分割表示されます:
            <button
            onClick={() => setShowSplitInfo((prev) => !prev)}
            className="ml-4 text-xs text-white bg-gray-600 px-2 py-0.5 rounded"
          >
            {showSplitInfo ? '▲ 閉じる' : '▼ 開く'}
          </button>
          </div>
          
        </div>

        {showSplitInfo && (
          <ul className="list-disc pl-5 mt-2">
            {splitEnemyMoveInfos.map((info, i) => (
              <li key={i}>
                {info.worstName}（{info.worstGuard}）<br />
                {info.bestName}（{info.bestGuard}）
              </li>
            ))}
          </ul>
        )}
      </div>
    )}




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

  {(focusedPlayerMove || focusedEnemyMove) && (
  <div className="mb-4 text-sm text-white-700 bg-yellow-100 dark:bg-gray-700 p-2 rounded">
    <div>現在の絞り込み状態：</div>
    {focusedPlayerMove && <div>自キャラ技: {focusedPlayerMove}</div>}
    {focusedEnemyMove && <div>相手キャラ技: {focusedEnemyMove}</div>}
    <button
      onClick={() => {
        setFocusedPlayerMove(null);
        setFocusedEnemyMove(null);
      }}
      className="mt-2 px-2 py-1 bg-gray-500 text-white rounded"
    >
      絞り込み解除
    </button>
  </div>
)}


      



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
              bgColorClass = 'bg-rose-800 text-white'; // 危険技（+）
            } else if (guardValue <= -4) {
              bgColorClass = 'bg-green-800 text-white'; // 確反あり技（-4以下）
            } else if (guardValue < 0) {
              bgColorClass = 'bg-blue-700 text-white'; // 安全技（-1 ～ -3）
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
                  <button
                    onClick={() => setFocusedEnemyMove(em.name)}
                    className="text-xs px-1 py-0.5 bg-gray-900 text-white rounded"
                  >
                    限
                  </button>
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
                <button
                  onClick={() => setFocusedPlayerMove(pm.name)}
                  className="text-xs px-1 py-0.5 bg-gray-700 text-white rounded"
                >
                  限
                </button>
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
  



    </div>
  );
};

export default MatchupChecker;