-- Generated from OpenStreetMap data (c) OpenStreetMap contributors, ODbL
-- Bounding box (south,west,north,east): 48.2,-124.5,48.m9,-123

-- OSM does not tell us the difficulty level, so allow it to be empty
alter table public.spots alter column level drop not null;
alter table public.spots alter column level drop default;

-- Remove the two test rows from the schema step
delete from public.spots where name = 'Test Reef';
delete from public.schools where name = 'Test Dive Club';

insert into public.spots (name, description, location, max_depth_m, osm_id) values
('South Bedford Island', null, st_point(-123.603333, 48.311667)::geography, null, 'node/663869264'),
('Race Rocks - Great Race', null, st_point(-123.532759, 48.299283)::geography, null, 'node/663869265'),
('Race Rocks - West and Central', null, st_point(-123.539121, 48.300677)::geography, null, 'node/663869266'),
('Barnard Castle', null, st_point(-123.541408, 48.31211)::geography, null, 'node/663869269'),
('Swordfish Island', null, st_point(-123.582582, 48.310238)::geography, null, 'node/663869270'),
('Saxe Point', null, st_point(-123.418333, 48.423333)::geography, null, 'node/663869272'),
('S. F. Tolmie', null, st_point(-123.402219, 48.417403)::geography, null, 'node/663869274'),
('Johnstone Reef', null, st_point(-123.271667, 48.478333)::geography, null, 'node/663869275'),
('Ogden Point (The Breakwater)', null, st_point(-123.384114, 48.41487)::geography, null, 'node/663869277'),
('Spring Bay', null, st_point(-123.268763, 48.455882)::geography, null, 'node/663869278'),
('Telegraph Cove', null, st_point(-123.270272, 48.463861)::geography, null, 'node/663869279'),
('Ten Mile Point', null, st_point(-123.266006, 48.455614)::geography, null, 'node/663869281'),
('Discovery Island', null, st_point(-123.251667, 48.423333)::geography, null, 'node/663869283'),
('Fulford Reef', null, st_point(-123.2401753, 48.4456302)::geography, null, 'node/663869284'),
('Chain Islet', null, st_point(-123.266667, 48.421667)::geography, null, 'node/663869285'),
('Brinn Rock', null, st_point(-123.2225531, 48.4245893)::geography, null, 'node/663869286'),
('Virtue Rock', null, st_point(-123.254072, 48.4178454)::geography, null, 'node/663869288'),
('Mouat Reef', null, st_point(-123.298333, 48.408333)::geography, null, 'node/663869289'),
('McKenzie Bright', null, st_point(-123.505, 48.558333)::geography, null, 'node/663869292'),
('Willis Point', null, st_point(-123.484987, 48.5783336)::geography, null, 'node/663869293'),
('Senanus Island', null, st_point(-123.4860212, 48.5919298)::geography, null, 'node/663869294'),
('Henderson Point', null, st_point(-123.480744, 48.597889)::geography, null, 'node/663869295'),
('Tozier Rock', null, st_point(-123.513333, 48.618333)::geography, null, 'node/663869296'),
('White Lady (Repulse Rock)', null, st_point(-123.5396496, 48.5460203)::geography, null, 'node/663869297'),
('Dyer Rocks', null, st_point(-123.483333, 48.623333)::geography, null, 'node/663869298'),
('Wain Rock', null, st_point(-123.488333, 48.688333)::geography, null, 'node/663869299'),
('Arbutus Island', null, st_point(-123.435, 48.706667)::geography, null, 'node/663869300'),
('Patey Rock', null, st_point(-123.52, 48.7)::geography, null, 'node/663869301'),
('G.B. Church', null, st_point(-123.2866667, 48.67)::geography, null, 'node/663869306'),
('Graham`s Wall', null, st_point(-123.321667, 48.67)::geography, null, 'node/663869307'),
('Reay Island', null, st_point(-123.328333, 48.676667)::geography, null, 'node/663869310'),
('Joan Rock', null, st_point(-123.316667, 48.69)::geography, null, 'node/663869311'),
('Little Group Islands', null, st_point(-123.366667, 48.671667)::geography, null, 'node/663869312'),
('Forest Island', null, st_point(-123.333333, 48.66)::geography, null, 'node/663869313'),
('Cooper Reef', null, st_point(-123.2767469, 48.6709185)::geography, null, 'node/663869314'),
('Rubly Island', null, st_point(-123.311467, 48.6653)::geography, null, 'node/663869315'),
('Arachne Reef', null, st_point(-123.2936772, 48.6847226)::geography, null, 'node/663869316'),
('North Cod Reef', null, st_point(-123.3002013, 48.6576056)::geography, null, 'node/663869317'),
('South Cod Reef', null, st_point(-123.3, 48.653333)::geography, null, 'node/663869319'),
('Imrie Island', null, st_point(-123.3331116, 48.6945172)::geography, null, 'node/663869320')
on conflict (osm_id) do nothing;

insert into public.schools (name, description, location, website, phone, email, osm_id) values
('East 2 West Freediving', null, st_point(-123.3648106, 48.4323934)::geography, 'https://east2westfreediving.ca/', '+1 672 974-4416', null, 'node/3317905670'),
('Ogden Point Dive Centre', null, st_point(-123.384868, 48.4153919)::geography, null, null, null, 'node/3487599528'),
('Wilson Diving', null, st_point(-123.4679855, 48.4461024)::geography, 'https://www.wilsondiving.com/', '+1 250 478-4488', null, 'node/13948756384')
on conflict (osm_id) do nothing;
