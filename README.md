# TripleFlow project page

Project page for **TripleFlow: Training-Free Video Object Removal by Bridging Residual Editing and Native Generation**.

- Website: https://songhe1998.github.io/TripleFlow/
- Paper: https://arxiv.org/abs/2609.39157

This repository contains the static project website and selected video results. It does not contain the research implementation or model weights.

## Preview

Serve the repository with a static HTTP server, for example:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/. There are no build dependencies, third-party scripts, analytics, or external font requests.

## Edit

- `index.html`: paper details, method explanation, and citation.
- `style.css`: responsive layout and visual styling.
- `app.js`: draggable before/after video reveals, thumbnail selection, synchronized playback, seeking, and restart. The divider supports mouse, touch, and keyboard arrows; Home/End reveal either video in full.
- `assets/data.js`: public video metadata and relative asset paths.
- `assets/abstract.txt`: the paper abstract.
- `assets/pipeline.png`: the paper's pipeline figure.
- `videos/`: selected source and result viewing copies, with poster images.

Publish the repository's `main` branch at its root using GitHub Pages. `.nojekyll` keeps the website as plain static files.

## Video provenance

The page uses selected qualitative examples from the wild-video experiments, the six previously selected Wan motion/effects scenes, and the art-gallery case: thirteen showcase cases and four comparison cases, with 50 MP4 files in total. Source and edited clips retain the original frame order and matched playback rate; the page does not crop or retime a method to improve its apparent result. These selected examples are not an unbiased aggregate evaluation.

For the comparison gallery, ContextFlow uses the stored Wan 5B adaptation with independently generated MagicQuill first frames, and OmniEraser uses the stored 512-resolution framewise results. These settings are also disclosed on the page. The paper contains the full benchmark protocols.

Website assets are provided for viewing the research results. This repository does not grant a new license to third-party benchmark materials or pretrained models.
