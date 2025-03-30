# detect_and_mark_duplicates.py
# 同一フォルダ内のJSONを検査し、nameの重複に仮名を付け、かつ"name"以外の差分も表示

import json
import glob
import os
from collections import Counter, defaultdict

def extract_non_name_fields(entry):
    """'name' 以外のフィールドを取り出す（比較用）"""
    return {k: v for k, v in entry.items() if k != "name"}

def compare_dicts(d1, d2):
    """2つの辞書の差分を返す"""
    diff = {}
    keys = set(d1.keys()) | set(d2.keys())
    for key in keys:
        if d1.get(key) != d2.get(key):
            diff[key] = (d1.get(key), d2.get(key))
    return diff

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pattern = os.path.join(script_dir, "*.json")

    for filepath in glob.glob(pattern):
        print(f"\nチェック中: {os.path.basename(filepath)}")
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"[スキップ] {filepath} 読み込みエラー: {e}")
                continue

        if not isinstance(data, list):
            print(f"[スキップ] {filepath} は配列（リスト）形式ではありません")
            continue

        name_counter = Counter()
        name_indices = defaultdict(list)

        for i, entry in enumerate(data):
            if not isinstance(entry, dict):
                print(f"[スキップ] {filepath} の {i} 番目は dict ではありません")
                continue
            name = entry.get("name")
            if name:
                name_counter[name] += 1
                name_indices[name].append(i)

        modified = False
        for name, count in name_counter.items():
            if count > 1:
                print(f"[警告] 重複: '{name}' が {count} 回")

                # 差分確認
                entries = [data[i] for i in name_indices[name]]
                ref_data = extract_non_name_fields(entries[0])
                for idx, entry in enumerate(entries[1:], start=2):
                    comp_data = extract_non_name_fields(entry)
                    diff = compare_dicts(ref_data, comp_data)
                    if diff:
                        print(f"  ⚠ 差分（{name}の{idx}個目）:")
                        for field, (a, b) in diff.items():
                            print(f"    - {field}: '{a}' → '{b}'")

                # 仮番号を振る
                for idx, entry_index in enumerate(name_indices[name], start=1):
                    abnormal_number = 100 - idx
                    new_name = f"{name}.{abnormal_number:02d}"
                    data[entry_index]["name"] = new_name
                    print(f"  → {name} → {new_name}")
                    modified = True

        if modified:
            new_path = filepath.replace(".json", "_marked.json")
            with open(new_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"[保存] 重複修正済ファイル: {os.path.basename(new_path)}")
        else:
            print(f"[OK] 重複なし")

if __name__ == "__main__":
    main()
