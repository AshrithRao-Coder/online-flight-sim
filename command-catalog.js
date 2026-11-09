// Shared command catalog. Account actions are always authorized by the server.
export const COMMANDS = [
  {
    "name": "help",
    "optionalArgs": true,
    "role": "player",
    "scope": "local",
    "args": "{Command name (optional)}",
    "description": "List your commands or show one example"
  },
  {
    "name": "refuel",
    "optionalArgs": true,
    "role": "pilot",
    "scope": "flight",
    "args": "{Fuel percentage 0-100 (optional)} {Pilot's Name (optional)}",
    "description": "Refill fuel, optionally to a percentage",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "bookmark",
    "role": "pilot",
    "scope": "flight",
    "args": "{Bookmark name} {Pilot's Name (optional)}",
    "description": "Save this flight position for the session",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "bookmarks",
    "role": "pilot",
    "scope": "local",
    "args": "",
    "description": "List saved flight bookmarks"
  },
  {
    "name": "rearm",
    "role": "vip",
    "scope": "flight",
    "args": "{Pilot's Name (optional)}",
    "description": "Instantly replenish your aircraft weapons",
    "selfArgs": 0,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "level",
    "role": "vip",
    "scope": "flight",
    "args": "{Pilot's Name (optional)}",
    "description": "Level the wings and stop pitch/roll rotation",
    "selfArgs": 0,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "heading",
    "role": "vip",
    "scope": "flight",
    "args": "{Heading in degrees 0-360} {Pilot's Name (optional)}",
    "description": "Turn to an exact compass heading",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "speed",
    "role": "vip",
    "scope": "flight",
    "args": "{Airspeed in knots} {Pilot's Name (optional)}",
    "description": "Instantly set the indicated airspeed in knots",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "boost",
    "optionalArgs": true,
    "role": "vip",
    "scope": "flight",
    "args": "{Airspeed in knots (optional)} {Pilot's Name (optional)}",
    "description": "Instantly set airspeed, or add 25 percent if omitted",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "weatherpresets",
    "role": "vip",
    "scope": "flight",
    "args": "{Weather presets} {Pilot's Name (optional)}",
    "description": "Weather, turbulence and crosswind: clear, few, scattered, overcast, rain, storm, breezy, crosswind, gusty, severe, hurricane or hurricane-extreme",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "mode",
    "role": "vip",
    "scope": "flight",
    "args": "{Solo mode: free or guns or drone or bandit} {Pilot's Name (optional)}",
    "description": "Switch your current solo game without restarting",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "repair",
    "role": "instructor",
    "scope": "flight",
    "args": "{Pilot's Name (optional)}",
    "description": "Restore your aircraft hull to 100% in multiplayer dogfight or solo drone and bandit modes",
    "selfArgs": 0,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "teleport",
    "role": "instructor",
    "scope": "flight",
    "args": "{Latitude} {Longitude} {Altitude in feet (optional)} {Pilot's Name (optional)}",
    "description": "Move to latitude, longitude and optional altitude in feet",
    "selfArgs": 3,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "return",
    "role": "instructor",
    "scope": "flight",
    "args": "{Bookmark name} {Pilot's Name (optional)}",
    "description": "Return to a saved flight bookmark",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "rewind",
    "role": "instructor",
    "scope": "flight",
    "args": "{Seconds 5-60} {Pilot's Name (optional)}",
    "description": "Rewind your flight by 5 to 60 seconds",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "practice",
    "role": "instructor",
    "scope": "flight",
    "args": "{Practice type: stall or engineout or approach or recovery} {Pilot's Name (optional)}",
    "description": "Set up stall, engineout, approach or recovery practice",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "spawn",
    "role": "instructor",
    "scope": "flight",
    "args": "{Target type: drone or bandit or ground} {Count 1-8} {Pilot's Name (optional)}",
    "description": "Spawn 1 to 8 drone, bandit or ground targets in solo combat",
    "selfArgs": 2,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "cleartargets",
    "role": "instructor",
    "scope": "flight",
    "args": "{Pilot's Name (optional)}",
    "description": "Remove your local practice targets",
    "selfArgs": 0,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "kick",
    "role": "moderator",
    "scope": "server",
    "args": "{Pilot's Name} {Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "kick a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "mute",
    "role": "moderator",
    "scope": "server",
    "args": "{Pilot's Name} {Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "mute a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "unmute",
    "role": "moderator",
    "scope": "server",
    "args": "{Pilot's Name}",
    "description": "unmute a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "warn",
    "role": "moderator",
    "scope": "server",
    "args": "{Pilot's Name} {Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "warn a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "announce",
    "role": "moderator",
    "scope": "server",
    "args": "{Announcement message}",
    "description": "Send a room announcement"
  },
  {
    "name": "slowchat",
    "role": "moderator",
    "scope": "server",
    "args": "{Chat interval in seconds 1-30} {Duration: 30s or 5m or 2h or infinite (optional)}",
    "description": "Set room chat interval from 1 to 30 seconds"
  },
  {
    "name": "clear-chat",
    "role": "moderator",
    "scope": "server",
    "args": "",
    "description": "Clear the room chat display"
  },
  {
    "name": "roster",
    "role": "moderator",
    "scope": "server",
    "args": "",
    "description": "View all registered pilots, online or offline",
    "accountAction": true
  },
  {
    "name": "ban",
    "role": "manager",
    "scope": "server",
    "args": "{Pilot's Name} {Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "ban a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "banlist",
    "role": "manager",
    "scope": "server",
    "args": "",
    "description": "banlist a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "unban",
    "role": "manager",
    "scope": "server",
    "args": "{Pilot's Name}",
    "description": "unban a pilot account without changing its access code",
    "accountAction": true
  },
  {
    "name": "kickall",
    "role": "moderator",
    "scope": "server",
    "args": "{Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "kick all lower-rank registered pilots",
    "accountAction": true,
    "action": "kick",
    "allPilots": true
  },
  {
    "name": "lockroom",
    "role": "manager",
    "scope": "server",
    "args": "{Duration: 30s or 5m or 2h or infinite (optional)}",
    "description": "Stop new lower-rank accounts joining this room"
  },
  {
    "name": "unlockroom",
    "role": "manager",
    "scope": "server",
    "args": "",
    "description": "Reopen this room"
  },
  {
    "name": "rename-room",
    "role": "manager",
    "scope": "server",
    "args": "{Room name}",
    "description": "Rename your current room"
  },
  {
    "name": "roomtopic",
    "role": "manager",
    "scope": "server",
    "args": "{Room briefing}",
    "description": "Set the room briefing"
  },
  {
    "name": "roommode",
    "role": "manager",
    "scope": "server",
    "args": "{Room mode: free or dogfight}",
    "description": "Switch your room to free or dogfight"
  },
  {
    "name": "close-room",
    "role": "manager",
    "scope": "server",
    "args": "",
    "description": "Close your current room"
  },
  {
    "name": "serverstats",
    "role": "admin",
    "scope": "server",
    "args": "",
    "description": "Show server uptime, pilots, rooms and sessions"
  },
  {
    "name": "broadcast",
    "role": "admin",
    "scope": "server",
    "args": "{Broadcast message}",
    "description": "Send an announcement to every connected pilot"
  },
  {
    "name": "locklobby",
    "role": "admin",
    "scope": "server",
    "args": "{Duration: 30s or 5m or 2h or infinite (optional)}",
    "description": "Stop non-Admin pilots joining or creating rooms"
  },
  {
    "name": "unlocklobby",
    "role": "admin",
    "scope": "server",
    "args": "",
    "description": "Reopen multiplayer joining"
  },
  {
    "name": "reset-scores",
    "role": "admin",
    "scope": "server",
    "args": "",
    "description": "Reset scores in this room, respecting role hierarchy"
  },
  {
    "name": "unlimited-fuel",
    "role": "admin",
    "scope": "flight",
    "args": "{on or off} {Pilot's Name (optional)}",
    "description": "Keep your own fuel full until disabled",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "admin"
  },
  {
    "name": "noclip",
    "role": "admin",
    "scope": "flight",
    "args": "{on or off} {Pilot's Name (optional)}",
    "description": "Disable scenery collisions for your own flight",
    "selfArgs": 1,
    "targetable": true,
    "targetRole": "admin"
  },
  {
    "name": "serverrooms",
    "role": "admin",
    "scope": "server",
    "args": "",
    "description": "List every public and private room with its room code"
  },
  {
    "name": "enter-room",
    "role": "admin",
    "scope": "server",
    "args": "{Room code}",
    "description": "Enter a private or locked room as Admin to moderate it"
  },
  {
    "name": "repairall",
    "role": "instructor",
    "scope": "server",
    "args": "",
    "description": "Restore all other pilots to 100% health in combat; queue offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "repair",
    "allPilots": true
  },
  {
    "name": "disarm",
    "role": "instructor",
    "scope": "flight",
    "args": "{Pilot's Name (optional)}",
    "optionalArgs": true,
    "description": "Disarm your aircraft, or a pilot, until rearmed.",
    "selfArgs": 0,
    "targetable": true,
    "targetRole": "instructor"
  },
  {
    "name": "refuelall",
    "role": "instructor",
    "scope": "server",
    "args": "{Fuel percentage 0-100 (optional)}",
    "description": "Apply refuel to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "refuel",
    "allPilots": true
  },
  {
    "name": "bookmarkall",
    "role": "instructor",
    "scope": "server",
    "args": "{Bookmark name}",
    "description": "Apply bookmark to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "bookmark",
    "allPilots": true
  },
  {
    "name": "rearmall",
    "role": "instructor",
    "scope": "server",
    "args": "",
    "description": "Apply rearm to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "rearm",
    "allPilots": true
  },
  {
    "name": "levelall",
    "role": "instructor",
    "scope": "server",
    "args": "",
    "description": "Apply level to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "level",
    "allPilots": true
  },
  {
    "name": "headingall",
    "role": "instructor",
    "scope": "server",
    "args": "{Heading in degrees 0-360}",
    "description": "Apply heading to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "heading",
    "allPilots": true
  },
  {
    "name": "speedall",
    "role": "instructor",
    "scope": "server",
    "args": "{Airspeed in knots}",
    "description": "Apply speed to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "speed",
    "allPilots": true
  },
  {
    "name": "boostall",
    "role": "instructor",
    "scope": "server",
    "args": "{Airspeed in knots (optional)}",
    "description": "Apply boost to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "boost",
    "allPilots": true
  },
  {
    "name": "weatherpresetsall",
    "role": "instructor",
    "scope": "server",
    "args": "{Weather presets}",
    "description": "Apply weatherpresets to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "weatherpresets",
    "allPilots": true
  },
  {
    "name": "modeall",
    "role": "instructor",
    "scope": "server",
    "args": "{Solo mode: free or guns or drone or bandit}",
    "description": "Apply mode to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "mode",
    "allPilots": true
  },
  {
    "name": "teleportall",
    "role": "instructor",
    "scope": "server",
    "args": "{Latitude} {Longitude} {Altitude in feet (optional)}",
    "description": "Apply teleport to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "teleport",
    "allPilots": true
  },
  {
    "name": "returnall",
    "role": "instructor",
    "scope": "server",
    "args": "{Bookmark name}",
    "description": "Apply return to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "return",
    "allPilots": true
  },
  {
    "name": "rewindall",
    "role": "instructor",
    "scope": "server",
    "args": "{Seconds 5-60}",
    "description": "Apply rewind to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "rewind",
    "allPilots": true
  },
  {
    "name": "practiceall",
    "role": "instructor",
    "scope": "server",
    "args": "{Practice type: stall or engineout or approach or recovery}",
    "description": "Apply practice to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "practice",
    "allPilots": true
  },
  {
    "name": "spawnall",
    "role": "instructor",
    "scope": "server",
    "args": "{Target type: drone or bandit or ground} {Count 1-8}",
    "description": "Apply spawn to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "spawn",
    "allPilots": true
  },
  {
    "name": "cleartargetsall",
    "role": "instructor",
    "scope": "server",
    "args": "",
    "description": "Apply cleartargets to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "cleartargets",
    "allPilots": true
  },
  {
    "name": "unlimited-fuelall",
    "role": "admin",
    "scope": "server",
    "args": "{on or off}",
    "description": "Apply unlimited-fuel to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "unlimited-fuel",
    "allPilots": true
  },
  {
    "name": "noclipall",
    "role": "admin",
    "scope": "server",
    "args": "{on or off}",
    "description": "Apply noclip to all eligible pilots, queuing offline aircraft",
    "accountAction": true,
    "flightAction": true,
    "action": "noclip",
    "allPilots": true
  },
  {
    "name": "disarmall",
    "role": "instructor",
    "scope": "server",
    "args": "",
    "description": "Disarm all eligible pilots until rearmed",
    "accountAction": true,
    "flightAction": true,
    "action": "disarm",
    "allPilots": true
  },
  {
    "name": "banall",
    "role": "manager",
    "scope": "server",
    "args": "{Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "ban all lower-rank registered pilots",
    "accountAction": true,
    "action": "ban",
    "allPilots": true
  },
  {
    "name": "muteall",
    "role": "moderator",
    "scope": "server",
    "args": "{Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "mute all lower-rank registered pilots",
    "accountAction": true,
    "action": "mute",
    "allPilots": true
  },
  {
    "name": "warnall",
    "role": "moderator",
    "scope": "server",
    "args": "{Duration: 30s or 5m or 2h or infinite} {Reason (optional)}",
    "description": "warn all lower-rank registered pilots",
    "accountAction": true,
    "action": "warn",
    "allPilots": true
  },
  {
    "name": "unbanall",
    "role": "manager",
    "scope": "server",
    "args": "",
    "description": "unban all lower-rank registered pilots",
    "accountAction": true,
    "action": "unban",
    "allPilots": true
  },
  {
    "name": "unmuteall",
    "role": "moderator",
    "scope": "server",
    "args": "",
    "description": "unmute all lower-rank registered pilots",
    "accountAction": true,
    "action": "unmute",
    "allPilots": true
  },
  {
    "name": "unkick",
    "scope": "server",
    "role": "moderator",
    "accountAction": true,
    "action": "unkick",
    "allPilots": false,
    "args": "{Pilot's Name}",
    "description": "unkick a lower-rank account"
  },
  {
    "name": "unkickall",
    "scope": "server",
    "role": "moderator",
    "accountAction": true,
    "action": "unkick",
    "allPilots": true,
    "args": "",
    "description": "unkick all lower-rank accounts"
  },
  {
    "name": "unwarn",
    "scope": "server",
    "role": "moderator",
    "accountAction": true,
    "action": "unwarn",
    "allPilots": false,
    "args": "{Pilot's Name}",
    "description": "unwarn a lower-rank account"
  },
  {
    "name": "unwarnall",
    "scope": "server",
    "role": "moderator",
    "accountAction": true,
    "action": "unwarn",
    "allPilots": true,
    "args": "",
    "description": "unwarn all lower-rank accounts"
  },
  {
    "name": "demote",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "demote",
    "allPilots": false,
    "args": "{Pilot's Name} {Lower access level} {lockcodes (optional)}",
    "description": "Demote a pilot; optionally lock self-service code changes until /allowcodes"
  },
  {
    "name": "demoteall",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "demote",
    "allPilots": true,
    "args": "{Lower access level} {lockcodes (optional)}",
    "description": "Demote all eligible pilots; optionally lock self-service code changes until /allowcodes"
  },
  {
    "name": "promote",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "promote",
    "allPilots": false,
    "args": "{Pilot's Name} {Higher access level}",
    "description": "Promote a pilot; a valid code can change it again"
  },
  {
    "name": "promoteall",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "promote",
    "allPilots": true,
    "args": "{Higher access level}",
    "description": "Promote all eligible pilots; a valid code can change it again"
  },
  {
    "name": "allowcodes",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "allowcodes",
    "allPilots": false,
    "args": "{Pilot's Name}",
    "description": "Allow a pilot to change access codes again"
  },
  {
    "name": "allowcodesall",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "allowcodes",
    "allPilots": true,
    "args": "",
    "description": "Allow all eligible pilots to change access codes again"
  },
  {
    "name": "lockcodes",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "lockcodes",
    "allPilots": false,
    "args": "{Pilot's Name}",
    "description": "Lock access-code changes for a pilot without changing rank"
  },
  {
    "name": "lockcodesall",
    "role": "admin",
    "scope": "server",
    "accountAction": true,
    "action": "lockcodes",
    "allPilots": true,
    "args": "",
    "description": "Lock access-code changes for all eligible pilots without changing rank"
  }
];
export const commandByName = name => COMMANDS.find(c=>c.name===name);
