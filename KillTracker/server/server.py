
import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import random

app = Flask(__name__)
socketio = SocketIO(app)
localhost = True # Put your Own IP Below if Localhost


@app.route('/')
def home():
    return render_template('table.html')

@app.route('/new_kill', methods=['POST'])
def update_kills():
    kill_data = request.json
    print (kill_data)
    socketio.emit('new_kill', kill_data)
    return jsonify({'success': True, 'data': kill_data})


if __name__ == '__main__':
    if localhost:
        socketio.run(app, host='127.0.0.1', port=5050, debug=True)
    else:
        socketio.run(app, host='10.0.0.90', port=5050, debug=True)