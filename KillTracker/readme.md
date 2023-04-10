# Elite Dangerous Kills Tracker

This project is an Elite Dangerous Kills Tracker that logs and visualizes bounty hunting data. It consists of an EDMC plugin, a server, a web interface, and a test program.

## Introduction
This program scratches an itch I've had for years.  When playing ED, I'd like a running summary of the kills I've made.  I've thought about it often, but certainly didn't think I could pull it off without some major headaches and mistakes.

I had recently been dabbling with ChatGPT4 and was looking for a use case that was simple, but had some complexity to test a variety of componens in one solution.
Essentially, there are 2 bits at work here.   One is a EDMC plugin that collects events from the ED Journal and posts it to the second part, which is a web page that auto updates a fairly rich status screen when you receive a kill bounty.  It's seen limited testing so far in Resource Extraction Sites.  Much more testing needed.

There are 2 utilities provided.  One is a simple python http server you can run and host the file.  This is to receive communication and refresh the web page.  The second is a simple test program to create a sample kill and send it to the web server.  This exists for you to test communication to the web page and that your server is working.   All of these programs depend on the url being the same in the server.py, load.py and the createTestKill.py.   

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quickstart)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Layout](#folder-layout)
- [Features](#features)
- [To-Do](#to-do)
- [Caveats](#caveats)
- [Credits](#Credits)
- [Changes](#Changes)
- [Issues](#Issues)

## Requirements

- Python 3.8+
- Elite Dangerous Market Connector (EDMC)
- Flask
- flask_socketio
- Requests

## QuickStart
Assuming everything installed correctly.
1 goto you EDMC plugins directory /Killtracker/
2 check load.py and server.py are in sync w.r.t. server url.  Default is localhost.  Modify if you want to use your own IP and set LOCALHOST to false in server.py
3 run python server.py to start the server.  open the url in a browser.
4 start edmc.  check the plugin is loaded.  the prefs ui has a basic settings tab where you can test the server, but it doesn't save it yet.
5 start killing. 


## Installation

1. **Install Python**: Ensure you have Python 3.8 or newer installed on your system. You can download Python from [the official website](https://www.python.org/downloads/).

2. **Install EDMC**: Download and install the [Elite Dangerous Market Connector (EDMC)](https://github.com/EDCD/EDMarketConnector) following their installation guide.

3. **Install Python Dependencies**: Open a terminal or command prompt and run the following command to install the required Python libraries:

pip install flask flask_socketio requests


4. **Clone this Repository**: Clone this repository to your desired location on your computer.

5. **Configure EDMC Plugin**: Copy the plugin folder from this repository to the EDMC plugin directory. The plugin directory is usually located in `%LOCALAPPDATA%\EDMarketConnector\plugins` on Windows or `~/.config/EDMarketConnector/plugins` on Linux.

6. **Configure Server**: In the `server.py` file, update the `app.config["TEMPLATES_AUTO_RELOAD"]` and `app.config["SEND_FILE_MAX_AGE_DEFAULT"]` settings if needed.

7. **Configure Web Server**: If you plan to use a web server like Apache or Nginx to serve the web page, follow the respective web server's instructions on how to configure and serve a Flask application. For example, you may follow [this guide](https://flask.palletsprojects.com/en/2.1.x/deploying/gunicorn/) for deploying a Flask app using Gunicorn and Nginx.

8. **Docker Deployment (Optional)**: If you prefer to deploy the application using Docker, create a `Dockerfile` and a `docker-compose.yml` file based on the Docker documentation for Python and Flask applications. An example can be found in [this guide](https://runnable.com/docker/python/dockerize-your-python-application).

## Usage

1. **Run EDMC**: Start Elite Dangerous Market Connector and ensure the plugin is loaded.

2. **Run Server**: In a terminal or command prompt, navigate to the folder containing the `server.py` file and run:

python server.py

This will start the Flask server.

3. **Access Web Interface**: Open a web browser and visit `http://localhost:5000` to access the Bounty Tracker web interface.  You can make it work on any IP with minimal effort.  I will document this.

4. **Run Test Program (Optional)**: To simulate bounty hunting events for testing, run the test program in a terminal or command prompt:

python createTestKill.py


## Folder Layout

- `plugin`: The EDMC plugin folder.
- `server\server.py`: The Flask server script.
- `server\createTestKill.py`: The test program for simulating bounty hunting events.
- `server\templates`: Contains the HTML templates for the web interface.
- `server\static`: Contains the CSS stylesheets, JavaScript files, and other static files for the web interface.
- `server\images`: Contains the images files for the web interface (mostly ship thumbnails from EDAssets).

## Features

- Real-time tracking of bounty hunting events.
- Summary tables for bounties per faction, ship type, and event type.
- Top kills table with sorting and pagination.
- Ship type grid view with sorting and dynamic resizing based on screen width.
- Adjustable font size for tables.
- Desktop / Mobile Mode - Mobile lets you pick one grid to focus on.
- Some adjusting sizing of fonts for spaceing.
- Click Grid ships to change sort order

## To-Do
 Android Support? (works via browser)
 Run on different browsers?  Tested on Edge, Brave, Chrome, Samsung Internet
 Different Screen layouts? Kind happy with it.
 Preferences screen for plugin? [started]
 Get graphics for other kill types.   Thargoids, Scanners, etc.
 I don't kill traders so I don't know if the other ship types will have working art.  The images are there, but possibly wrong filenames.
 
## Caveats
This project is provided "as is" without warranty of any kind, either express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
The authors and contributors of this project shall not be held liable for any damages or loss caused or alleged to be caused by or in connection with the use of or reliance on the content provided.
This project is not affiliated with or endorsed by the creators of Elite Dangerous or any of its affiliates or subsidiaries.
99.9 %  of the code is written by ChatGPT4.  I have learned a ton about html/ js/ css, but it's not quality by any means.
I want to learn a bit more about test driven development, so I might ask the AI to help me learn and implement it.
I rarely play Elite anymore, so I'm probably not going to be able to be as active maintaining this as I would have liked.  I really want somebody to take it and make 100x better.  It started as an exercise in GPT4 and I remain an idiot programmer who doesn't really understand what I'm doing at all.
When Elite has more planetary landing content and exploration of atmospheric worlds, I'll probably come back.  This could probably be modified fairly easily to get ground combat tracked as well, but I can't see myself bothering.


## Credits
All the developers of Elite Dangerous Market Connector and whoever wrote the docs for the plugin system.
All the opensource devs who contributed to Python and all the libs in use.
To the guys in Flat Galaxy Society and especially anyone with any fond memories of [Null] / Conway City
To the contributors who added the ship artwork to https://edassets.org/
To CMDR Ian Norton who lead the way and got me interested in this.
To CMDR BuzzLiteYear who helps with the testing and is an awesome buddy to fly/drive with.  Since 1987.  C64, Amiga, PC and beyond.

## Changes
Moved to Changelog File

## Issues
 - Elite Dangerous Journal uses shipId's which don't match the shipNames in the journal.  I need to convert the names to make it work in the image display.  [edit, new JSON object] 
 - Must fix the top toolbar functionality and usability.  More material design??
 - I don't have nice art for ship launched fighters at the moment
 - Trying to save some screen real estate by faffing with the headers and buttons - I'm rubbish at it.
 - Sorting on the summary's back.  Kill List next

