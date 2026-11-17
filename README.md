De' Patisserie website
======================

This folder is the complete website. It needs no build step.

TO PUBLISH
- GitHub + Vercel (how your current site is set up): replace the files in your
  repository with everything in this folder (keep the same folder structure),
  then commit. Vercel will publish it automatically.
- Or drag this whole folder onto Netlify Drop, or upload it to any web host.

WHAT'S INSIDE
- index.html, saturday-treats.html, about.html, gallery.html, policies.html  (the 5 pages)
- css/sweet.css, css/extras.css  (styles)
- js/sweet.js  (menu, prices, order builder, animations)
- js/gallery.js  (Instagram-style photo viewer)
- assets/gallery/  (gallery photos)
- assets/img/  (logo and photos, optimised for faster loading)

QUICK EDITS (all in js/sweet.js)
- Prices: look for "menu data". Each flavour has a price per roll.
- Drop date: look for DROP_DATE. Leave it empty to always use the coming
  Saturday, or set a date like '2026-11-07'.
- WhatsApp number orders go to: look for WHATSAPP = '12462644609'.
If you change a price, also update the price text in index.html and
saturday-treats.html so the menu cards match.
