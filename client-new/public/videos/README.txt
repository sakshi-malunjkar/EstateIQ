PLACEHOLDER - hero background video goes here as:  public/videos/hero.mp4

Use a real drone / flythrough clip of one of our Nashik or Pune projects, or a licensed CC0
real-estate aerial. No copied media from other sites.

Keep it small - it autoplays on desktop:
  - 8-15 s seamless loop, NO audio track (the hero plays it muted anyway)
  - 1280x720 (or 1920x1080 max), H.264 MP4, ~1-3 MB
  - e.g.  ffmpeg -i source.mov -an -t 12 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -movflags +faststart hero.mp4
Also update public/images/hero-poster.jpg with a still from the same clip (first frame works best).

Until hero.mp4 exists the hero simply shows the poster image - nothing breaks.
