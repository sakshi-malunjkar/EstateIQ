import json

with open("data/synthetic/transcripts_full.json", encoding="utf-8") as f:
    data = json.load(f)

ls_data = [{"data": {"text": item["transcript"]}} for item in data]

with open("data/synthetic/transcripts_labelstudio.json", "w", encoding="utf-8") as f:
    json.dump(ls_data, f, indent=2, ensure_ascii=False)

print(f"Converted {len(ls_data)} transcripts for Label Studio import")