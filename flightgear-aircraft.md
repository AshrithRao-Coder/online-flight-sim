# Online Flight Sim aircraft models

Every aircraft in the Online Flight Sim fleet is converted from an open-source FlightGear aircraft
(FGAddon, https://sourceforge.net/projects/flightgear/ , and the FGMEMBERS mirror,
https://github.com/FGMEMBERS ). The FlightGear models are released under the GNU General
Public License (version 2 or later; the ATR 72, 707 and 737-300 under version 3; the CRJ700 under the
Creative Commons Attribution 4.0 licence, https://creativecommons.org/licenses/by/4.0/ ); the full text of the GPL
is in `flightgear-fgdata.txt` next to this file. The converted models (`assets/*.glb`)
are derived works under the same licence. Changes made for Online Flight Sim: interior, cockpit and
effect geometry removed; moving parts re-rigged for the game; the A319 and A321 are built
from the A320 by removing or adding fuselage frames; airliners, business jets and light aircraft
have an unbranded plain white finish painted over the original textures (no airline marks), while
military types keep their original FlightGear finish. The original sources are kept in the
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
| Cessna Citation X | FGAddon CitationX | FlightGear Citation X (Syd Adams), GNU GPL (FlightGear aircraft) |
| Boeing 757-200 | FGAddon 757-200 | FlightGear 757-200 (Juuso Tapaninen, John Williams; original 757-200 by Liam Gathercole, Skyop, Isaias Prestes), GNU GPL (FlightGear aircraft) |
| Airbus A340-600 | GitHub FGMEMBERS/A340-600HGW | FlightGear A340-600HGW (Liam Gathercole, Andino), GNU GPL (FlightGear aircraft) |
| Cessna 208B Grand Caravan | FGAddon Cessna-208B | FlightGear Cessna 208B Grand Caravan (ePilot, Bea Wolf), GNU GPL (FlightGear aircraft) |
| Cessna 182 Skylane | FGAddon c182s | FlightGear Cessna 182S (Heiko Schulz, Gilberto Agostinho, Benedikt Hallinger, onox, Wayne Bragg, Ron Jensen et al.), GNU GPL (FlightGear aircraft) |
| Aérospatiale Concorde | FGAddon Concorde | FlightGear Concorde (Christian Le Moigne, C. Schmitt et al.), GNU GPL (FlightGear aircraft) |
| Antonov An-225 Mriya | FGAddon AN-225 | FlightGear An-225 Mriya (Lee Elliott), GNU GPL (FlightGear aircraft) |
| Boeing 707-320B | FGAddon 707 | FlightGear 707 (Lake of Constance Hangar; original by Innis Cunningham), GNU GPL v3 |
| Boeing 717-200 | FGAddon 717 | FlightGear 717-200 (Gary Neely, Skyop), GNU GPL (FlightGear aircraft) |
| Boeing 737-100 | FGAddon 737-100 | FlightGear 737-100 (Emmanuel Baranger), GNU GPL (FlightGear aircraft) |
| Boeing 737-200 | FGAddon 737-200 | FlightGear 737-200 (Emmanuel Baranger), GNU GPL (FlightGear aircraft) |
| Boeing 737-300 | FGAddon 737-300 | FlightGear 737-300 (David Culp, Innis Cunningham, Heiko Schulz, Emmanuel Baranger; current version by Jarvum, e-pilot, Skyop, Soitanen), GNU GPL v3 |
| Boeing 747-100 | FGAddon 747 | FlightGear 747-100 (FlightGear contributors), GNU GPL (FlightGear aircraft) |
| Boeing 747-200 | FGAddon 747-200 | FlightGear 747-200 (Christian Le Moigne et al.), GNU GPL (FlightGear aircraft) |
| Boeing 747-400 | FGAddon 747-400 | FlightGear 747-400 (Gijs de Rooy, Ivan Ngeow, Jonathan Redpath et al.), GNU GPL (FlightGear aircraft) |
| Boeing 767-300 | FGAddon 767-300 | FlightGear 767-300 (Liam Gathercole, Isaias V. Prestes, Juuso Tapaninen, John Williams), GNU GPL (FlightGear aircraft) |
| kc135 | FGAddon KC135 | FlightGear KC-135 (David Culp, Innis Cunningham, Julien Pierru, Vivian Meazza), GNU GPL (FlightGear aircraft) |
| b29 | FGAddon b29 | FlightGear B-29 Superfortress (Joshua Babcock), GNU GPL (FlightGear aircraft) |
| Airbus A300-600 | FGAddon A300-600 | FlightGear A300-600 (Toryx, Airbus330, Pierre Duval, C-FWES), GNU GPL (FlightGear aircraft) |
| Douglas DC-8-63 | FGAddon dc8-63 | FlightGear DC-8-63 (Bob Faulkner, Isaias Prestes), GNU GPL (FlightGear aircraft) |
| Douglas DC-8-73 | FGAddon dc8-73 | FlightGear DC-8-73 (Bob Faulkner, Thomas Haigh, Isaias V. Prestes), GNU GPL (FlightGear aircraft) |
| Mcdonnell Douglas DC-10-30 | GitHub FGMEMBERS/DC-10-30 | FlightGear DC-10-30 (Ryan Miller), GNU GPL (FlightGear aircraft) |
| Bombardier CRJ-200 | FGAddon CRJ-200 | FlightGear CRJ-200 (Joshua Wilson, Nick I), GNU GPL (FlightGear aircraft) |
| Bombardier CRJ700 | FGAddon CRJ700-family | FlightGear CRJ700 (Ryan Miller, Henning S.), CC BY 4.0 (models and textures) |
| f14 | FGAddon f-14b | FlightGear F-14 Tomcat (Richard Harrison, Enrique Laso, Alexis Bory, Nikolai V. Chr.), GNU GPL (FlightGear aircraft) |
| f15 | FGAddon F-15 | FlightGear F-15C Eagle (Richard Harrison, Enrique Laso, Nikolai V. Chr., Joshua Davidson), GNU GPL (FlightGear aircraft) |
| su33 | FGAddon Sukhoi-Su-33 | FlightGear Su-33 (Emmanuel Baranger), GNU GPL (FlightGear aircraft) |
| su37 | FGAddon SU-37 | FlightGear Su-37 (Lee Elliott), GNU GPL (FlightGear aircraft) |
| su27 | GitHub FGMEMBERS/SU-27 | FlightGear Su-27 (Lee Elliott, StuartC, VooDoo), GNU GPL (FlightGear aircraft) |
| b1b | FGAddon B-1B | FlightGear B-1B Lancer (Markus Zojer, Paul Jay Schrenker, Ludovic Brenta, Andreas Spiekermann), GNU GPL (FlightGear aircraft) |
| b2 | FGAddon B-2 | FlightGear B-2 Spirit (Markus Zojer), GNU GPL (FlightGear aircraft) |

Aircraft names describe the modelled types; manufacturer trademarks remain with their owners.
