# 🤿 DiveING

**A map for divers.** Find dive spots and dive schools, see how to get there by boat, check the sea floor in 3D, and share photos and reviews with the community.

**Live demo:** https://dive-ing-v1.vercel.app


> Fun Project, work in progress. Information on the map is community-provided and for orientation only. It does **not** replace a briefing by a certified dive professional. The depth map uses coarse global data and is **not** suitable for dive planning or navigation.
=======
**A map for new divers.** Find dive spots and dive schools, see how to get there by boat, check the sea floor in 3D, and share photos and reviews with the community.
=======
**A map for divers.** Find dive spots and dive schools, see how to get there by boat, check the sea floor in 3D, and share photos and reviews with the community.
8eab7ee (README, env example and database scripts)

**Live demo:** https://dive-ing-v1.vercel.app



> Student project, work in progress. Information on the map is community-provided and for orientation only. It does **not** replace a briefing by a certified dive professional. The depth map uses coarse global data and is **not** suitable for dive planning or navigation.
672dbda (README, env example and database scripts)

---

## Features

- **Interactive map** with dive spots (blue) and dive schools (orange). Click a pin to open a side panel; the selected pin is highlighted, the others fade, and the map zooms in and back out.
- **Depth map and 3D view:** colours the sea by depth and tilts the map to show the shape of the sea floor.
- **Boat routes:** school staff draw the route from their school to a dive spot (with waypoints around land); the trip duration is estimated and can be adjusted.
- **Add and edit dive spots** as a verified user; every change is logged. New community spots are marked until an admin has checked them.
- **Photos:** upload in the browser (resized to 1600 px, thumbnail 400 px, hidden data such as GPS removed), gallery with large view, delete, and report.
- **Ratings and reviews** for spots and schools.
- **Accounts:** email and password with email confirmation, 18+ confirmation, optional certification level and agency.
- **Profile page** with stats (photos, spots added, dives), public bio and certification, and private data (licence number) visible only to you and admins.
- **Roles:** visitor, verified user, dive school staff, admin, enforced in the database (see below).
- **Admin menu:** see all accounts, grant the admin role, assign dive schools to accounts.
- **Start page** with live numbers (`/`), the map lives at `/map`.
- **Import of real data** from OpenStreetMap with a small script.

## Tech stack

| Area | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Map | [MapLibre GL JS](https://maplibre.org/) v5, OpenFreeMap vector style |
| Backend | [Supabase](https://supabase.com/): PostgreSQL + PostGIS, Auth, Storage, Row Level Security |
| Hosting | [Vercel](https://vercel.com/) |

## Roles and permissions

The rules are enforced by Row Level Security in the database, not only in the interface.

| Action | Visitor | Verified user | School staff | Admin |
|---|:--:|:--:|:--:|:--:|
| View map, spots, schools, photos, reviews | ✅ | ✅ | ✅ | ✅ |
| Add a dive spot | – | ✅ | ✅ | ✅ |
| Edit dive spot details | – | ✅ | ✅ | ✅ |
| Upload photos (delete own) | – | ✅ | ✅ | ✅ (delete any) |
| Write reviews | – | ✅ | ✅ (not own school) | ✅ |
| Edit own school and draw its boat routes | – | – | ✅ | ✅ (all schools) |
| Add a dive school | – | – | – | ✅ |
| Delete spots and schools, manage accounts and roles | – | – | – | ✅ |

*Verified user* means logged in with a confirmed email. *School staff* is a verified user that an admin assigned to a school.

## Getting started

### Requirements

- Node.js 20 or newer and Git
- A free [Supabase](https://supabase.com/) project

### 1. Clone and install

```bash
<<<<<<< HEAD
git clone https://github.com/EliasOutInTheWest/DiveIng.git
=======
git clone https://github.com/YOUR-USERNAME/DiveIng.git
>>>>>>> 672dbda (README, env example and database scripts)
cd DiveIng
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase values:

```bash
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
```

`.env.local` is ignored by Git. Never commit it and never use the Supabase **secret** key in this project.

### 3. Set up the database

Open **Supabase > SQL Editor** and run the files in the [`database/`](database/) folder **in this order**:

| # | File | What it does |
|---|---|---|
| 1 | `01-schema.sql` | Tables, PostGIS, indexes, rating views, basic security rules, two test rows |
| 2 | `02-edit-permissions.sql` | `admins` table and the `is_admin()` check |
| 3 | `03-accounts.sql` | Usernames, automatic profile creation on sign-up |
| 4 | `04-roles.sql` | Verified users, school staff, edit history of spots, permission rules |
| 5 | `05-admin-tools.sql` | Functions behind the admin menu (list accounts, grant admin) |
| 6 | `06-routes.sql` | Read and save boat routes |
| 7 | `07-photos-profile.sql` | Photo storage bucket, profile fields, private data, photo reports |
| 8 | `08-reviews.sql` | Rules for reviews |

### 4. Configure sign-in

In **Supabase > Authentication**:

- **Sign In / Providers > Email:** enabled, with **Confirm email** switched on.
- **URL Configuration:** set the **Site URL** to your site (locally `http://localhost:3000`) and add Redirect URLs `http://localhost:3000/**` and `https://YOUR-SITE.vercel.app/**`.

On the free plan Supabase sends only a few emails per hour. For testing you can add `+test1` to a Gmail address (`name+test1@gmail.com`) to create several accounts.

### 5. Map worker file

The map needs a worker file in `public/`. It is already in the repository (`public/maplibre-gl-csp-worker.js`). If you update the `maplibre-gl` package, copy it again so the versions match:

```bash
cp node_modules/maplibre-gl/dist/maplibre-gl-csp-worker.js public/
# Windows PowerShell: Copy-Item node_modules\maplibre-gl\dist\maplibre-gl-csp-worker.js public\
```

This project uses `maplibre-gl@5`.

### 6. Run it

```bash
npm run dev
```

Open http://localhost:3000 for the start page and http://localhost:3000/map for the map.

### 7. Create your first admin

1. Register in the app (or create a user in **Supabase > Authentication > Users** with *Auto Confirm User*).
2. Run this in the SQL Editor with your email:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR-EMAIL-HERE';
```

Log in again: you now see the **Admin menu** next to your name.

### 8. Load real dive spots (optional)

```bash
node scripts/fetch-osm.mjs
```

The script asks OpenStreetMap (Overpass API) for dive sites and dive centres in the bounding box set at the top of the file and writes `seed.sql`. Run that file in the SQL Editor, then mark the imported spots as checked:

```sql
update public.spots set is_verified = true where created_by is null;
```

Change `BBOX` in `scripts/fetch-osm.mjs` to import another region. Running it again is safe, existing entries are skipped.

## Project structure

```
app/
  page.tsx                 start page
  map/page.tsx             the map application
components/
  MapApp.tsx               puts the map, panels and menus together
  DiveMap.tsx              the map (pins, routes, depth map, 3D)
  SidePanel.tsx            details of a spot or school, routes, photos, reviews
  CreatePanel.tsx          form for a new spot or school
  PhotoSection.tsx         photo gallery and upload
  ReviewsSection.tsx       ratings and reviews
  ProfilePanel.tsx         own profile page
  AdminPanel.tsx           admin menu for accounts
  AuthBox.tsx              login and sign-up
  AuthProvider.tsx         who is logged in, roles
  DirtyContext.tsx         remembers unsaved input
  Stars.tsx                star rating
lib/
  supabase.ts              Supabase client
  types.ts, fields.ts      shared types and form fields
  geo.ts, depth.ts         distance helpers, depth colours
  image.ts                 resizes photos in the browser
  certs.ts                 certification levels and agencies
database/                  SQL files, run in order
scripts/
  fetch-osm.mjs            imports dive sites from OpenStreetMap
public/
  maplibre-gl-csp-worker.js
```

## Deployment

1. Push the repository to GitHub.
2. On [Vercel](https://vercel.com/), choose **Add New > Project** and import the repository.
3. Add the two environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Every push to the main branch publishes automatically.
5. Add the Vercel address to the Redirect URLs in Supabase (see step 4 above).

The Vercel *Hobby* plan is free for personal, non-commercial use. On Supabase's free plan, projects without activity for about a week are paused until you restore them in the dashboard.

## Data sources and credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL). Map tiles by [OpenFreeMap](https://openfreemap.org/) / OpenMapTiles.
- Depth and elevation data: [GEBCO](https://www.gebco.net/) / ETOPO1 and other sources via [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). Resolution is about 450 m, so details in shallow water are missing.
- Dive spot and dive school entries imported from OpenStreetMap; everything else is added by the community.

## Known limitations

- Depth data is coarse and has gaps near coasts. Not for dive planning or navigation.
- Dive spot information is community-provided and not verified by professionals.
- Boat routes are indicative; the skipper decides the real route.
- Photo reports are visible only in the Supabase Table Editor (`media_reports`) so far.

## Roadmap

- [x] Roles and permissions, admin menu
- [x] Photos, profile page, ratings and reviews
- [x] Depth map and 3D view, start page
- [ ] More real data for other regions, better depth data for coastal waters
- [ ] Edit existing boat routes
- [ ] Live conditions (waves, water temperature, tides)
- [ ] Friends and a photo/video feed
- [ ] Password reset, German translation
- [ ] Privacy policy and imprint before a public launch
- [ ] Moderation tools in the app (reports, edit history with revert)

## Author


Created by Elias Dockal. 
github.com/EliasOutInTheWest, 
linkedin.com/in/elias-dockal-b12b7526a/,
instagram.com/elias_moritz_nsw/

## License

No license has been chosen yet, so all rights are reserved.
=======
Created by **YOUR NAME**. Add your links here.

## License

No license has been chosen yet, so all rights are reserved. Add a `LICENSE` file (for example MIT) if you want others to reuse the code.
>>>>>>> 672dbda (README, env example and database scripts)
=======
Created by Elias Dockal
linkedin.com/in/elias-dockal-b12b7526a/
https://www.instagram.com/elias_moritz_nsw/
github.com/EliasOutInTheWest/

## License

No license has been chosen yet, so all rights are reserved. 
>>>>>>> 8eab7ee (README, env example and database scripts)
