from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "migrations"

def main() -> None:
    files = sorted(MIGRATIONS.glob("*.sql"))
    if not files:
        raise SystemExit("No SQL migrations found")

    connection = sqlite3.connect(":memory:")
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        for migration in files:
            sql = migration.read_text(encoding="utf-8")
            connection.executescript(sql)
            print(f"VALID {migration.name}")

        violations = connection.execute("PRAGMA foreign_key_check").fetchall()
        if violations:
            raise SystemExit(f"Foreign-key violations: {violations}")

        expected = {
            "ontology_entities",
            "ontology_relationships",
            "ontology_audit",
            "aston_data_sources",
            "aston_ingestion_jobs",
            "aston_decision_events",
            "aston_agents",
            "aston_delegations",
            "aston_policy_versions",
            "aston_spend_entries",
            "aston_simulations",
            "aston_media_rights",
            "aston_safety_decisions",
            "aston_mcp_tools",
            "aston_compliance_evidence",
        }
        actual = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        missing = sorted(expected - actual)
        if missing:
            raise SystemExit(f"Missing expected tables: {missing}")

        print(f"PASS: {len(files)} migrations parsed; {len(expected)} expected tables found; foreign keys valid.")
    finally:
        connection.close()

if __name__ == "__main__":
    main()
