
import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import random

app = Flask(__name__)
socketio = SocketIO(app)
localhost = False # Put your Own IP Below if Localhost


@app.route('/')
def home():
    return render_template('table.html')

@app.route('/new_kill', methods=['POST'])
def update_kills():
    kill_data = request.json
    print (kill_data)
    socketio.emit('new_kill', kill_data)
    return jsonify({'success': True, 'data': kill_data})


@app.route('/new_test', methods=['POST'])
def update_test():
    kill_data = request.json
    print (kill_data)
    socketio.emit('new_test', kill_data)
    return jsonify({'success': True, 'data': kill_data})

@app.route('/speech_enable', methods=['GET'])
def speech_enable():    
    socketio.emit('speech_enable')
    return jsonify({'success': True})

@app.route('/speech_disable', methods=['GET'])
def speech_disable():    
    socketio.emit('speech_disable')
    return jsonify({'success': True})

@app.route('/test_server', methods=['GET'])
def test_server():    
    socketio.emit('test_server')
    return jsonify({'success': True})





if __name__ == '__main__':
    if localhost:
        socketio.run(app, host='127.0.0.1', port=5050, debug=True)
    else:
        socketio.run(app, host='10.0.0.90', port=5050, debug=True)