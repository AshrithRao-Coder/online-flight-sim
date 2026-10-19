# Online Flight Sim aircraft models

Every aircraft in the Online Flight Sim fleet is converted from an open-source FlightGear aircraft
(FGAddon, https://sourceforge.net/projects/flightgear/ , and the FGMEMBERS mirror,
https://github.com/FGMEMBERS ). The FlightGear models are released under the GNU General
Public License (version 2 or later; the ATR 72 under version 3); the full text of the GPL
is in `flightgear-fgdata.txt` next to this file. The converted models (`assets/*.glb`)
are derived works under the same licence. Changes made for Online Flight Sim: interior, cockpit and
effect geometry removed; moving parts re-rigged for the game; the A319 and A321 are built
from the A320 by removing or adding fuselage frames; an unbranded plain white finish painted over
the original textures (no airline marks). The original sources are kept in the
project under `models-src/`, and the conversion scripts are `scripts/fg_*.py`.

| Online Flight Sim aircraft | FlightGear source | Authors |
|---|---|---|
| Airbus A320 | FGAddon A320-family | FlightGear A320-family (Josh Davidson, Jonathan Redpath, merspieler, Matthew Maring, Thorsten Herrmann, Semir Gebran), GPL-2.0 |
| Airbus A321 | FGAddon A320-family | FlightGear A320-family (Josh Davidson, Jonathan Redpath, merspieler, Matthew Maring, Thorsten Herrmann, Semir Gebran), GPL-2.0 |
| Airbus A319 | FGAddon A320-family | FlightGear A320-family (Josh Davidson, Jonathan Redpath, merspieler, Matthew Maring, Thorsten Herrmann, Semir Gebran), GPL-2.0 |
| Airbus A380-800 | GitHub FGMEMBERS/A380-omega | FlightGear A380 (N. Muraleedharan, Ampere K., I. Cunningham, F. Dalvi, S. Hamilton et al.), GNU GPL (FlightGear aircraft) |
| Airbus A350-900 | GitHub FGMEMBERS/A350XWB | FlightGear A350 XWB (vezza), GNU GPL (FlightGear aircraft) |
| Airbus A330-300 | GitHub FGMEMBERS/IDG-A33X | FlightGear A330 (Immersive Design Group: Joshua Davidson, Jonathan Redpath, Thorsten Herrmann, J Maverick 16), GNU GPL (FlightGear aircraft) |
| Boeing 787-8 Dreamliner | FGAddon 787-8 | FlightGear 787-8 Dreamliner (Omega95, Redneck, Jentron, Thomas Albrecht et al.), GNU GPL (FlightGear aircraft) |
| Boeing 787-9 Dreamliner | GitHub FGMEMBERS/787-9 | FlightGear 787-9 Dreamliner (Omega95, Redneck, Jentron et al.), GNU GPL (FlightGear aircraft) |
| Boeing 747-8F | FGAddon 747-8i | FlightGear 747-8 (John Williams, Grupo FGBr), GNU GPL (FlightGear aircraft) |
| Boeing 777-300ER | FGAddon 777 | FlightGear 777 (Justin Smithies, Syd Adams, Thorsten Brehm, Hyde Yamakawa et al.), GNU GPL (FlightGear aircraft) |
| Boeing 737-800 | GitHub FGMEMBERS/737-800YV | FlightGear 737-800 (Gabriel Hernandez, Joshua Davidson, legoboyvdlp, RenanMsV), GNU GPL (FlightGear aircraft) |
| Embraer E190 | GitHub FGMEMBERS/E-jet-family | FlightGear E-Jet family (Narendran Muraleedharan et al.), GNU GPL (FlightGear aircraft) |
| Airbus A220-300 | GitHub FGMEMBERS/CSeries | FlightGear CSeries / A220 (ACJZA, Joshua Davidson, Jonathan Redpath, D-ECHO, Pakistan-1, Gabriel Hernandez), GNU GPL (FlightGear aircraft) |
| ATR 72-500 | GitHub FGMEMBERS/ATR72 | FlightGear ATR 72-500 (Narendran Muraleedharan, Donald Belcham, Dwayne Gable, ot-666, camelon), GNU GPL v3 (FlightGear aircraft) |
| Bombardier Challenger 650 | GitHub FGMEMBERS/Challenger650 | FlightGear Challenger 650 (Ryan Miller, Henning S., D-ECHO), GNU GPL (FlightGear aircraft) |
| Pilatus PC-24 | FGAddon Pilatus-PC-24 | FlightGear Pilatus PC-24 contributors, GNU GPL (FlightGear aircraft) |
| General Dynamics F-16 Fighting Falcon | FGAddon f16 | FlightGear F-16 (Erik Hofman, Martin Schmitt, Pensacola, Nikolai V. Chr., J Maverick 16, Richard Harrison, Josh Davidson et al.), GNU GPL (FlightGear aircraft) |
| Rotary Wing Utility Helicopter | FGAddon UH-1 | FlightGear UH-1 (Emmanuel Baranger, StuartC, Simon Lister, Maik Justus), GNU GPL (FlightGear aircraft) |
| Cessna 172 Skyhawk | GitHub FGMEMBERS/c172p-detailed | FlightGear Cessna 172P (David Megginson, Gilberto Agostinho, Wayne Bragg, Juan Vera del Campo et al.), GNU GPL (FlightGear aircraft) |
| Diamond DA40 Diamond Star | FGAddon Diamond-Da40 | FlightGear DA40 (Emmanuel Baranger), GNU GPL (FlightGear aircraft) |
| Piper PA-28 Archer | FGAddon PA28 | FlightGear PA-28 (Josh Davidson, Niels Krenz, Bea Wolf, Sascha Reissner), GNU GPL (FlightGear aircraft) |
| Cirrus SR22 | FGAddon Cirrus-SR22 | FlightGear SR22 (Emmanuel Baranger), GNU GPL (FlightGear aircraft) |
| De Havilland DHC-6 Twin Otter | FGAddon dhc6 | FlightGear DHC-6 Twin Otter (Syd Adams, Christian Thiriot, Bo Lan, Jonathan Schellhase et al.), GNU GPL (FlightGear aircraft) |
| Pilatus PC-12 | FGAddon Pilatus-PC-12 | FlightGear PC-12 (Emmanuel Baranger), GNU GPL (FlightGear aircraft) |

Aircraft names describe the modelled types; manufacturer trademarks remain with their owners.
