#!/usr/bin/env sh
cd "$(dirname "$0")"
printf 'Trainer Booking disponible en http://localhost:5173\n'
python3 -m http.server 5173
