"use client";
import { loadBoard } from "@/lib/leaderboard";
import { useEffect, useState } from "react";

export default function Leaderboard({ game, highlight }) {
  const [rows, setRows] = useState([]);
  useEffect(() => setRows(loadBoard(game)), [game, highlight]);
  if (!rows.length) return <div className="board-empty">Noch keine Einträge – du bist der Erste!</div>;
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="board">
      {rows.map((r, i) => (
        <div key={i} className={`board-row ${highlight === i + 1 ? "me" : ""}`}>
          <span className="board-rank">{medal[i] || `${i + 1}.`}</span>
          <span className="board-name">{r.name}</span>
          <span className="board-score">{r.score}</span>
        </div>
      ))}
    </div>
  );
}
