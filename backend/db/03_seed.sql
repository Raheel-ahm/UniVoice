-- Starter departments and categories. Edit names to match your campus.
-- Rows that already exist (same id or name) are skipped.

insert into public.departments (id, name) overriding system value values
  (1, 'Electrical'),
  (2, 'Plumbing'),
  (3, 'Carpentry & Furniture'),
  (4, 'IT & AV Services'),
  (5, 'HVAC'),
  (6, 'Civil Works'),
  (7, 'Housekeeping'),
  (8, 'Grounds'),
  (9, 'Safety & Security Equipment')
on conflict do nothing;

insert into public.categories (id, name, default_department_id) overriding system value
select v.id, v.name, d.id
from (values
  (1,  'Electrical fault',              'Electrical'),
  (2,  'Lighting',                      'Electrical'),
  (3,  'Plumbing leak',                 'Plumbing'),
  (4,  'Blocked drain or toilet',       'Plumbing'),
  (5,  'Water supply',                  'Plumbing'),
  (6,  'Broken furniture',              'Carpentry & Furniture'),
  (7,  'Doors, windows & locks',        'Carpentry & Furniture'),
  (8,  'Computers, projectors & AV',    'IT & AV Services'),
  (9,  'Wi-Fi & network',               'IT & AV Services'),
  (10, 'Air conditioning & heating',    'HVAC'),
  (11, 'Walls, ceilings & floors',      'Civil Works'),
  (12, 'Cleanliness & waste',           'Housekeeping'),
  (13, 'Outdoor areas & paths',         'Grounds'),
  (14, 'Fire & safety equipment',       'Safety & Security Equipment'),
  (15, 'Other',                         'Civil Works')
) as v(id, name, dept)
join public.departments d on d.name = v.dept
on conflict do nothing;
