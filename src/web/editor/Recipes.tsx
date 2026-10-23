import React, { useState } from "react";
import type { Recipe } from "../../shared/types";
import { api } from "../api";
import { useEditor } from "./context";

// Recipes: a whole reel setup saved under a name, applied in one tap.
export function RecipesCard() {
  const { project, reel, brand, updateBrand, notify, onAuthError } = useEditor();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [withSounds, setWithSounds] = useState(reel.sounds.length > 0);
  const [withGraphics, setWithGraphics] = useState(reel.overlays.some((o) => o.graphic));
  const [withEndCard, setWithEndCard] = useState(Boolean(reel.endCard?.on));

  const apply = async (body: { recipeId?: string; recipe?: Recipe }, label: string) => {
    try {
      const r = await api.applyRecipe([project.id], body);
      notify(`“${label}” applied.${r.suggesting ? " Claude is suggesting graphics; they'll appear in a minute." : ""}`);
    } catch (err) {
      onAuthError(err);
      notify((err as Error).message);
    }
  };

  const useLast = async () => {
    const all = await api.listProjects().catch((err) => (onAuthError(err), []));
    const last = all.filter((p) => p.id !== project.id && !p.parentId && p.status === "ready").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!last) return notify("No other reel to copy from yet.");
    const recipe: Recipe = { id: "last", name: "Your last reel's settings", style: last.style, autoSounds: last.sounds.length > 0, suggestGraphics: false, endCard: last.endCard?.on ? last.endCard : null };
    await apply({ recipe }, recipe.name);
  };

  const save = () => {
    if (!name.trim()) return;
    const recipe: Recipe = {
      id: `recipe-${Date.now()}`,
      name: name.trim(),
      style: { ...reel.style, hookPlace: null },
      autoSounds: withSounds,
      suggestGraphics: withGraphics,
      endCard: withEndCard && reel.endCard?.on ? reel.endCard : null,
    };
    updateBrand({ ...brand, recipes: [...brand.recipes.filter((r) => r.name.toLowerCase() !== recipe.name.toLowerCase()), recipe] });
    setSaving(false);
    setName("");
    notify(`Saved “${recipe.name}”. Apply it to any reel here, or to many at once from My reels › Select.`);
  };

  return (
    <section className="panel-card">
      <header className="panel-head">
        <div>
          <h3>Recipes</h3>
          <p className="muted small">Your whole setup in one tap: look, speed, color, clean audio, zoom, end card, sounds and graphics.</p>
        </div>
      </header>
      <div className="row">
        {brand.recipes.map((r) => (
          <span key={r.id} className="chip recipe-chip">
            <button onClick={() => apply({ recipeId: r.id }, r.name)}>{r.name}</button>
            <button
              className="recipe-x"
              aria-label={`Delete recipe ${r.name}`}
              onClick={() => confirm(`Delete the recipe "${r.name}"?`) && updateBrand({ ...brand, recipes: brand.recipes.filter((x) => x.id !== r.id) })}
            >
              ×
            </button>
          </span>
        ))}
        <button className="chip" onClick={useLast}>↺ Use my last reel's settings</button>
        <button className="chip accent" onClick={() => setSaving(!saving)}>{saving ? "Cancel" : "＋ Save this reel as a recipe"}</button>
      </div>
      {saving ? (
        <div className="adjust">
          <input value={name} placeholder="Name it, e.g. Tuesday Tips" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} aria-label="Recipe name" />
          <label className="check"><input type="checkbox" checked={withSounds} onChange={(e) => setWithSounds(e.target.checked)} /> Add sound effects by moment</label>
          <label className="check"><input type="checkbox" checked={withGraphics} onChange={(e) => setWithGraphics(e.target.checked)} /> Have Claude suggest graphics</label>
          <label className="check"><input type="checkbox" checked={withEndCard} disabled={!reel.endCard?.on} onChange={(e) => setWithEndCard(e.target.checked)} /> Include this reel's end card</label>
          <button className="btn primary small-btn" disabled={!name.trim()} onClick={save}>Save recipe</button>
        </div>
      ) : null}
    </section>
  );
}
