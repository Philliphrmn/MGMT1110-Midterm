"""Builds supabase/seed/chN.sql from data/chN.json + data/open_answers.json.

Each file upserts one chapter, so new chapters (5, 7, ...) can be added
by dropping in data/chN.json and running this script again.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "supabase" / "seed"


def lit(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def jlit(v):
    return lit(json.dumps(v, ensure_ascii=False)) + "::jsonb"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    answers = json.loads((DATA / "open_answers.json").read_text())
    for path in sorted(DATA.glob("ch[0-9]*.json")):
        d = json.loads(path.read_text())
        c = d["chapter"]
        assert all(len(q["o"]) == 4 for q in d["mc"]), path
        nums = [q["n"] for q in d["mc"]]
        assert len(nums) == len(set(nums)), path
        sql = [
            f"insert into public.chapters (chapter, title, scenarios) values ({c}, {lit(d['title'])}, {jlit(d.get('scenarios', {}))})"
            " on conflict (chapter) do update set title = excluded.title, scenarios = excluded.scenarios;"
        ]
        rows = []
        for q in d["mc"]:
            rows.append(
                f"({lit(f'c{c}-q{q['n']:02d}')}, {c}, {q['n']}, {lit(q.get('scenario'))}, {lit(q['q'])}, "
                f"{jlit(q['o'])}, {lit(q['a'])}, {lit(q.get('marked'))}, {lit(q.get('note'))}, {'true' if q.get('unsure') else 'false'})"
            )
        sql.append(
            "insert into public.questions (id, chapter, num, scenario, question, options, answer, marked, note, unsure) values\n"
            + ",\n".join(rows)
            + "\non conflict (id) do update set scenario = excluded.scenario, question = excluded.question,"
            " options = excluded.options, answer = excluded.answer, marked = excluded.marked, note = excluded.note, unsure = excluded.unsure;"
        )
        model = answers.get(str(c), [])
        if d.get("open"):
            assert len(model) == len(d["open"]), f"missing model answers for chapter {c}"
            rows = [
                f"({lit(f'c{c}-o{i}')}, {c}, {i}, {lit(q)}, {lit(model[i - 1])})"
                for i, q in enumerate(d["open"], 1)
            ]
            sql.append(
                "insert into public.open_questions (id, chapter, num, question, model_answer) values\n"
                + ",\n".join(rows)
                + "\non conflict (id) do update set question = excluded.question, model_answer = excluded.model_answer;"
            )
        (OUT / f"ch{c}.sql").write_text("\n\n".join(sql) + "\n")
        print(f"chapter {c}: {len(d['mc'])} MC, {len(d.get('open', []))} open")

    pc = json.loads((DATA / "part_c.json").read_text())
    (OUT / "part_c.sql").write_text(
        "insert into public.open_questions (id, chapter, num, question, model_answer, part) values\n"
        f"({lit(pc['id'])}, null, 1, {lit(pc['question'])}, {lit(pc['model_answer'])}, 'C')\n"
        "on conflict (id) do update set question = excluded.question, model_answer = excluded.model_answer, part = excluded.part;\n"
    )
    print("part C reflection question")


if __name__ == "__main__":
    main()
