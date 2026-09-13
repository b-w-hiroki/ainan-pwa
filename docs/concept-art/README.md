# AINAN Fishing Concept Art

This folder keeps visual design references created during the fishing-game redesign. These are **concept references, not production assets**.

## What this sheet captures

The contact sheet summarizes the visual exploration that led to the current in-game direction:

1. Fishing UI / camera storyboard
2. Harbor fishing concept
3. Big-fish hit presentation
4. Fishing UI + hit presentation
5. Big-fish challenge composition
6. Harbor fishing screen study
7. Relaxed harbor-fishing layout
8. Seaside fishing-game layout
9. Harbor fishing-game composition
10. Long-cast / camera-follow concept
11. Lure-retrieve fishing concept

## Current design principles derived from the concepts

- Keep the playfield at a readable scale; do not zoom the entire field out for long casts.
- When the lure travels beyond the viewport, let the camera follow the cast.
- After landing, prioritize lure position, fish shadows, and nearby reactions.
- Keep the player character visible when practical; when the camera leaves the player behind, use a small action inset instead of a permanent split screen.
- The core interaction is `CAST -> RETRIEVE -> INTEREST -> BITE -> BATTLE -> CATCH`.
- Retrieval should support `wait`, `twitch / short reel`, and `slow reel` actions.
- Fish behavior should communicate interest visually: notice, follow, inspect, bite-ready, or spook.
- Catch presentation should reconnect the player to the town loop, with `Bring to town` as the primary result action.

## Files

- `fishing-concept-contact-sheet.jpg` — compact overview of the concept-art iterations.

The original high-resolution generations were created in the design conversation; this repository copy is intentionally a lightweight reference sheet so it stays separate from production game assets.
