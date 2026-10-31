# astorb3d

An educational, scientifically honest 3D visualization of the Solar System's asteroids, drawn from public orbit catalogs. It shows where objects are within a stated tolerance; it is not an ephemeris or prediction service.

## Data

**Catalog**:
The upstream list of asteroid orbits published by a provider, such as Lowell astorb or MPC MPCORB.
_Avoid_: source file, database

**Snapshot**:
One dated, checksummed download of a catalog, archived so it can be rebuilt from exactly.
_Avoid_: dump, version, catalog (when you mean one download)

**Dataset**:
What we build from one snapshot and what the app loads: a manifest plus its chunks.
_Avoid_: catalog, binary, data file

**Chunk**:
One independently fetched and verified piece of a dataset.
_Avoid_: shard, tile, block

**Record**:
One asteroid's entry in a dataset.
_Avoid_: row, vertex, point (when you mean the data)

## Time

**Epoch**:
The instant the orbital elements in a snapshot describe; every record in a snapshot shares it.
_Avoid_: data epoch, catalog epoch, time 0, catalog date

**Snapshot date**:
When a snapshot was downloaded. Lowell's epoch is always within 50 days of it, before or after.
_Avoid_: catalog date, update date

**Sim date**:
The date the scene is currently showing.
_Avoid_: sim time, current time, display date

**Publish date**:
When a dataset went live on the site.
_Avoid_: release date, deploy date

## Identity

**Designation**:
An asteroid's stable identity: its number if it has one, otherwise its provisional designation.
_Avoid_: ID, key, index

**Number**:
The permanent number the MPC assigns once an orbit is well established; not every asteroid has one.
_Avoid_: catalog number, index

**Provisional designation**:
The year-and-letters label an asteroid gets at discovery, such as `2004 MN4`.
_Avoid_: temporary ID

**Name**:
An optional, display-only label such as Ceres or Apophis; never used as an identity.
_Avoid_: title, label

## Orbits

**Dynamical class**:
The single orbital population an asteroid belongs to (for example Apollo, Hilda, Trojan L4), computed from its orbital elements using JPL's definitions where JPL has them.
_Avoid_: type, family, group, category
