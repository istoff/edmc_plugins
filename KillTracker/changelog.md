## Changes 
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
