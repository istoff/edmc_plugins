## Changes 
6 May 2023
- Cleaned up some interface oddities with the page setting
- Added browser setting for speech.  if you had multiple pages open, all of them would talk!
- bugfix on conda detection

3 May 2023
- Cleaned up the settings screen.  Paid more attention to the plugins.md spec on EDMC Github to be more compatible
- Added some variety to the speech
- Realised if I have multiple views running simultaneously, speech setting comes from all devices, so need to fix this.  Currently speech can be toggled via the plugin prefs.
- you can directly enable or disable the speech by opening a tab and calling the server url + speech_enable or speech_disable  from another tab, e.g. http://10.0.0.90:5050/speech_enable
- more niggles and bug fixes.
- still not happy with conflict zone and haven't killed thargoids in forever, so not really suited for those types of combat.

20 April 2023
- Big changes
- Removed dependency on JSON files to translate the mess that is ship names.  Hopefully the ship names are all working now.
- Cleaned up the plugin and javascript to better handle multiple event types
- Added ship targetted event.  keeps track of High value kills nearby.  Helps your prioritise
- Ships added to list if value > 500 000 on first sighting.  Bounty value incremented after KWS
- Speech events announce some of that.  Haven't put in a toggle yet.
- Random (x3) for each noted event.  Need to add more
- Battled with Conflict Zone Kills.  Game doesn't tell you what you've killed.  Tracking the data to see if it can be inferred by the bounty value, but it's so broken
- Haven't touched PVPKills and ThargoidKills.  Don't know what data is generated.  If some kind soul would enable logging in the plugin, do a bunch of those types of kills and send me the data, I will see what I can do.
- Todo.  Some interface niggles w.r.t. paging the main Kill List.
- Add Speech toggle to Plugin Prefs.
13 April 2023
- Added persistence.  Kills don't delete after browser refresh.
- Added button to manually wipe data. Needed due to persistence.
- Preference screen mostly works.  Changes only saved when you click IP / Localhost buttons!

10 April 2023
- Added Favicon
- Moved Grid before Summary.  I like the look
- More font/slimming in the UI
- Can't find ship info in Combat Zone kill events.  Ship is blank.

9 April 2023
- Changed style for totals
- Added location at the top left below heading
- Added style to selected button, desktop or mobile
- Removed locales from numbers.  Was affecting totals.

8 April 2023
- added prefs UI.  Not fully integrated, but allows you to do connection test 
- changed some UI elements for neatness to reduce screen space
- added support for additional faction rewards which happens when you use a Kill Warrant Scanner
- split Faction and VictimFaction

7 April 2023 
- ditched material design except for the cards.  just too flaky for me.  
- Added totals to summaries which I had broken
- Added initial support for combat zone kills ( Need Cmdr BuzzLiteYear to test) 
- Neatened up the graphics for the cards.
- LOTS of work to clean up the names of the ships.  changed json.  if ships have wrong thumbnail, it's fixable in json.

4 April 2023 
- Disaster.  Firstly I had not committed the correct version as referred to in change log.  Then proceeded to wipe the latest version with the git verion.  Rookie mistake, but technically, I am a > 50 year old Git Rookie. 
- Eventually decided to reimplement the broken functionality, but had to redo a ton from scratch and rebasing the previus release.  
- Did one good thing which was to split the javascript out to a .js file which helps a ton.
- Hated the look of the grid items, so switched to Material Design Cards.  Would have been nice in White, but Elite is Orange and Black.  What you gonna do??
- Some regressions remain.  I have a worse toolbar on the top, which needs cleanup and the pagination is broken.  
- I have improved the json for the shipTypes so am well on the way to repairing the broken image and descriptions based on Journal issues.

3 April 2023 
- Added layouts for Mobile.  The idea is that you can run it on a couple of phones or tablets and have them all update separately.  One tablet could have  the ship kill grid and your phone could have stats.  They should all update simultaneously.
- Tested that the server.py can run on a remote machine and then accessed via any web browser.  For laptop users who want to see the output elsewhere.
- Lots of code cleanups.  Still messy though.
- Changes to file layout.   the server folder can be copied to another pc.  The only thing you need on your elite dangerous pc is the load.py plugin
- Style sheets a mess.  I hate html and javascript and all things related.  Can't wait for somebody else to beautify my crude work.

2 April 2023 - Initial Commit
