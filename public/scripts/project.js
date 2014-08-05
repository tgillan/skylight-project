/**
 * project.js represents the client-side scripting for the the user interface
 * author: Tony Gillan
 * version: 0.1
 * date: 27/05/14
 * requires: 
 */

/**
 * global variable definition
 */
var socket = null;	//holder for io.socket server
var username = "user" + Math.floor((Math.random() * 10000) + 1);	//default unique name for client
var firstName = "ServerF";
var lastName = "ServerL";
var email = "server@email.com";
var password = "";
var currentRoom = "foyer";	//default starting room
var selectedUser = "foyer";	//current user to send private messages to


/**
 * @method outputMessage
 * @description emits a message object to the Node.js server
 * @param command String - the command or message type
 * @param message String - the actual message text
 * @param audience String - local (loopback), server (command to server only), all (public message)
 * @return -
 * @status 
 */
function outputMessage(command, message, audience, name) {
	if (command!==null && command!==undefined && audience!==undefined && audience!==null) {
		switch (audience) {
			case '_local' :
				//output message to this client only
				outputComment(message);
				break;
			case '_server' :
				//send command to server
				document.getElementById('outputbox').value += '\n[to server] ' + message;
				if (socket!==undefined && socket!==null) {
					socket.emit('command', {
						command: command,
						from: username,
						to: 'server',
						content: message,
						echo: 'all'
					});
				}
				break;
			case '_all' :
				//broadcast message to all connected users
				document.getElementById('outputbox').value += '\n[to all] ' + message;
				if (socket!==undefined && socket!==null) {
					socket.emit('public message', {
						command: 'broadcast',
						from: username,
						to: 'all',
						content: message,
						echo: 'all'
					});
				}
				break;
			case '_room' :
				//broadcast message to all users in current room
				document.getElementById('outputbox').value += '\n[to ' + audience + ':' + name + '] ' +
																			 message;
				if (socket!==undefined && socket!==null) {
					socket.emit('room message', {
						command: 'room',
						from: username,
						to: name,
						content: message,
						echo: 'all'
					});
				}
				break;
			case '_user' :
				//send private message to a client
				document.getElementById('outputbox').value += '\n[to ' + audience + ':' + name + '] ' +
																			 message;
				if (socket!==undefined && socket!==null) {
					socket.emit('private message', {
						command: 'private',
						from: username,
						to: name,
						content: message,
						echo: 'all'
					});
				}
				break;
			default :
				break;
		}
	}
}

//output message to this client only
function outputComment(message) {
	if (message!==null && message!==undefined) {
		document.getElementById('outputbox').value += '\n[local] ' + message;
	}
}


/**
 * gui processing feed through to processCommand
 */
function processProfile() {
	//update user profile from fields
	var username = document.getElementById("pusernameinput").value;
	var firstName = document.getElementById("pfirstnameinput").value;
	var lastName = document.getElementById("plastnameinput").value;
	
	//#
	
}
function processLogin() {
	var email = document.getElementById("emailinput").value;
	var password = document.getElementById("passwordinput").value;
	processCommand('login', null, null, null, email, password);
}
function processLogout() {
	processCommand('logout', null, null, null, null, null);
}
function resetPassword() {
	var email = document.getElementById("emailinput").value;
	processCommand('resetpassword', null, null, null, email, null);
}
function changePassword() {
	
	//# change current password to new one entered in password field

}
function deleteAccount() {
	
	//# delete all current account details associated with email and logout user

}



function sendPrivate() {
	var message = document.getElementById("cmessageinput").value;
	var toUser = getSelectedUser();
	console.log('sendPrivate() called with: ' + message + " to: " + toUser);
	processCommand('send', message, toUser, null, null, null);
}
function sendRoom() {
	var message = document.getElementById("cmessageinput").value;
	var toRoom = getSelectedRoom();
	console.log('sendRoom() called with: ' + message + " to: " + toRoom);
	processCommand('room', message, null, toRoom, null, null);
}
function sendBroadcast() {
	var message = document.getElementById("cmessageinput").value;
	console.log('sendBroadcast() called with: ' + message);
	processCommand('broadcast', message, null, null, null, null);
}



//called by html select list when changed
function roomListChanged() {
	var toRoom = getSelectedRoom();
	outputComment("roomListChanged called with " + getSelectedRoom());
	processCommand('changeroom', null, null, toRoom, null, null);
}
//called by html select list when changed
function userListChanged() {
	var toUser = getSelectedUser();
	outputComment("userListChanged called with " + getSelectedUser());
	//no need to process further as only used locally as parameter for send command
}


function getSelectedUser() {
	var output = null;
	var userList = document.getElementById('userlist');
	if (userList!==undefined && userList!==null &&
		 userList.selectedIndex!==undefined && userList.selectedIndex!==null) {
		output = userList.options[userList.selectedIndex].value;	//dont use text
	}
	return output;
}
function getSelectedRoom() {
	var output = null;
	var roomList = document.getElementById('roomlist');
	if (roomList!==undefined && roomList!==null &&
		 roomList.selectedIndex!==undefined && roomList.selectedIndex!==null) {
		output = roomList.options[roomList.selectedIndex].value;	//dont use text
	}
	return output;
}

//called by server to update list
function updateUserList(userList, selectedUser) {
	if (userList!==undefined && userList!==null) {
		refreshList('userlist', userList, selectedUser);
	}
}

//called by server to update list
function updateRoomList(roomList, selectedRoom) {
	if (roomList!==undefined && roomList!==null) {
		refreshList('roomlist', roomList, selectedRoom);
	}
}

//refreshes a dropdown list
function refreshList(listID, updateList, selectedName) {
	var output = false;
	if (listID!==undefined && listID!==null && updateList!==undefined && updateList!==null) {
		var listElement = document.getElementById(listID);
		if (listElement!==undefined && listElement!==null &&
			 listElement.options!==undefined && listElement.options!==null) {
			var lastIndex = listElement.options.length;
			if (lastIndex>=0) {
				//remove all previous items
				while (listElement.options.length) {
					listElement.options[0] = null;
				}
				
				//now populate list with new items
				for (var i=0; i<updateList.length; i++) {
					listElement.options[listElement.length] = new Option(updateList[i].text,
																			updateList[i].value);	//text, value
				}
				
				//now update selected item
				var matched = false;
				for (var i=0; i<listElement.length && !matched; i++) {
					if (listElement.options[i].value==selectedName) {
						matched = true;
						listElement.selectedIndex = i;
					}
				}
				output = true;
			}
		}
	}
	return output;	
}


//called by server to refresh UI, fields and current state to reflect new info sent from server
function refreshUI(title, description, email, username, firstName, lastName,
						 userList, roomList, currentRoom, loggedIn) {
	console.log('refreshUI() called with ' + 
					' title=' + title +
					' description=' + description +
					' email=' + email +
					' username=' + username +
					' firstName=' + firstName +
					' lastName=' + lastName +
					' userList=' + userList.toString() +
					' roomList=' + roomList.toString() +
					' currentRoom=' + currentRoom +
					' loggedIn=' + loggedIn);
	if (title!==undefined && title!==null) {
		document.getElementById("servername").value = title;
	}
	if (description!==undefined && description!==null) {
		document.getElementById("serverinfo").value = description;
	}
	if (email!==undefined && email!==null) {
		document.getElementById("emailinput").value = email;
		document.getElementById("pemailinput").value = email;
	}
	if (username!==undefined && username!==null) {
		document.getElementById("pusernameinput").value = username;
	}
	if (firstName!==undefined && firstName!==null) {
		document.getElementById("pfirstnameinput").value = firstName;
	}
	if (lastName!==undefined && lastName!==null) {
		document.getElementById("plastnameinput").value = lastName;
	}
	updateUserList(userList, null);
	updateRoomList(roomList, currentRoom);
	if (loggedIn!==undefined && loggedIn!==null) {
		
		//#
		
	}
}


//ui panel display toggles
function showAccountView(makeVisible, showBtn) {
	if (makeVisible) {
		if (showBtn) {
			document.getElementById("hideaccountbtn").style.display = 'block';
		} else {
			document.getElementById("hideaccountbtn").style.display = 'none';
		}
		document.getElementById("showaccountbtn").style.display = 'none';
		document.getElementById("accountpanel").style.display = 'block';
	} else {
		if (showBtn) {
			document.getElementById("showaccountbtn").style.display = 'block';
		} else {
			document.getElementById("showaccountbtn").style.display = 'none';
		}
		document.getElementById("hideaccountbtn").style.display = 'none';
		document.getElementById("accountpanel").style.display = 'none';
	}
}
function showCommandView(makeVisible) {
	if (makeVisible) {
		document.getElementById("hidecommandbtn").style.display = 'block';
		document.getElementById("showcommandbtn").style.display = 'none';
		document.getElementById("commandinputpanel").style.display = 'block';
	} else {
		document.getElementById("showcommandbtn").style.display = 'block';
		document.getElementById("hidecommandbtn").style.display = 'none';
		document.getElementById("commandinputpanel").style.display = 'none';
	}
}
function showDialogView(makeVisible) {
	if (makeVisible) {
		document.getElementById("hidedialogbtn").style.display = 'block';
		document.getElementById("showdialogbtn").style.display = 'none';
		document.getElementById("commandpanel").style.display = 'block';
	} else {
		document.getElementById("showdialogbtn").style.display = 'block';
		document.getElementById("hidedialogbtn").style.display = 'none';
		document.getElementById("commandpanel").style.display = 'none';
	}
}
function showVideoView(makeVisible) {
	if (makeVisible) {
		document.getElementById("hidevideobtn").style.display = 'block';
		document.getElementById("showvideobtn").style.display = 'none';
		document.getElementById("outputpanel").style.display = 'block';
	} else {
		document.getElementById("showvideobtn").style.display = 'block';
		document.getElementById("hidevideobtn").style.display = 'none';
		document.getElementById("outputpanel").style.display = 'none';
	}
}
function showChatView(makeVisible) {
	if (makeVisible) {
		document.getElementById("hidechatbtn").style.display = 'block';
		document.getElementById("showchatbtn").style.display = 'none';
		document.getElementById("chatpanel").style.display = 'block';
	} else {
		document.getElementById("showchatbtn").style.display = 'block';
		document.getElementById("hidechatbtn").style.display = 'none';
		document.getElementById("chatpanel").style.display = 'none';
	}
}
function showQueryView(makeVisible) {
	if (makeVisible) {
		document.getElementById("hidequerybtn").style.display = 'block';
		document.getElementById("showquerybtn").style.display = 'none';
		document.getElementById("querypanel").style.display = 'block';
	} else {
		document.getElementById("showquerybtn").style.display = 'block';
		document.getElementById("hidequerybtn").style.display = 'none';
		document.getElementById("querypanel").style.display = 'none';
	}
}
function showLoggedInView(makeVisible) {
	if (makeVisible) {
		showAccountView(false, true);
		showDialogView(true);
		showCommandView(false);
		showQueryView(false);
		showChatView(true);
		showVideoView(false);
		document.getElementById("profilepanel").style.display = 'block';
		document.getElementById("loginpanel").style.display = 'none';
		document.getElementById("commandcontainer").style.display = 'block';
		document.getElementById("chatcontainer").style.display = 'block';
		document.getElementById("outputcontainer").style.display = 'block';
	} else {
		document.getElementById("loginpanel").style.display = 'block';
		document.getElementById("profilepanel").style.display = 'none';
		document.getElementById("commandcontainer").style.display = 'none';
		document.getElementById("chatcontainer").style.display = 'none';
		document.getElementById("outputcontainer").style.display = 'none';
		showAccountView(true, false);
		showDialogView(false);
		showCommandView(false);
		showQueryView(true);
		showChatView(false);
		showVideoView(false);
	}
}


/**
 * command-line processing feed through to processCommand
 */
function processInput() {
	var output = false;
	var command = document.getElementById("commandinput").value;
	if (command===undefined || command===null) {
		outputComment("!invalid command.");
	} else {
		var commandList = splitText(command, 1, ' ');
		if (commandList.length==2) {
			switch (commandList[0]) {
				case 'send' :
					var msgList = splitText(commandList[1], 1, ' ');
					if (msgList.length==2) {	
						processCommand(commandList[0], msgList[1], msgList[0], null, null, null);
					} else {
						//invalid parameters	
					}
					break;
				case 'room' :
					var msgList = splitText(commandList[1], 1, ' ');
					if (msgList.length==2) {	
						processCommand(commandList[0], msgList[1], null, msgList[0], null, null);
					} else {
						//invalid parameters	
					}
					break;
				default :
					processCommand(commandList[0], commandList[1], null, null, null, null);
					break;	
			}
		} else {
			outputComment("!invalid command parameters.");
		}
	}
	return output;
}


/**
 * main command processing function for formatting and sending commands to node socket server
 */
function processCommand(command, message, toUser, toRoom, email, password) {
	var output = false;
	outputComment("processCommand() was called with command: " + command + " message: " + message);
	if (command!==undefined && command!==null) {
		switch (command) {
			case '?' :
			case 'help' :
				//output help documentation to user
				outputComment("command list: ?, help, load <filename>, login <email> <password>," +
								  " command <command>, send <username> <message>, broadcast <message>," +
								  " room <message>, changeroom <room name>," +
								  " list <all|room|username|inventory>, logout");
				break;
			case 'changeroom' :
				//move to a new room
				if (toRoom!==undefined && toRoom!==null) {
					outputMessage(command, toRoom, "_server", null);
				} else {
					outputComment("!room unrecognized");
				}
				break;
			case 'list' :
				//list user and room details
				outputMessage(command, message, "_server", null);
				break;
			case 'login' :
				//login to get full access
				var msgObj = { email:email, password:password };
				outputMessage(command, msgObj, "_server", null);
				break;
			case 'logout' :
				//attempt to leave application
				outputMessage('logout', null, "_server", null);	
				break;				
			case 'send' :
				//send a private message to another user (online or offline)
				outputMessage(command, message, "_user", toUser);
				break;
			case 'broadcast' :
				//send a public message to all online users
				outputMessage(command, message, "_all", null);
				break;
			case 'room' :
				//send a public message to all users in room
				outputMessage(command, message, "_room", toRoom);
				break;
			case 'command' :
				//send a command to the server
				outputMessage(command, message, "_server", null);
				break;
			case 'load' :
				//tell server to load xml
				outputMessage(command, message, "_server", null);
				break;
			case 'save' :
				//tell server to save xml
				outputMessage(command, message, "_server", null);
				break;
			case 'resetpassword' :
				//tell server to send an email with password reset details
				var msgObj = { email:email };
				outputMessage(command, msgObj, "_server", null);
				break;
			default :
				outputComment("!command unrecognized: " + command);
				break;
		}
	}
	return output;
}


//will split a text String into count number of array items from left to right
// e.g. take 1st 2 word from front of text and return as array[word1, word2, tail]
function splitText(text, headCount, separator) {
	var output = null;
	if (text!==undefined && text!==null && headCount>0) {
		output = [];
		var wordList = text.split(separator);
		if (wordList.length>0) {
			for (var i=0; i<wordList.length && i<headCount; i++) {
				output.push(wordList[i]);
			}
			wordList.splice(0, headCount);	//remove first headCount words
			var tail = wordList.join(" ");
			output.push(tail);
		}
	}
	return output;
}

function initialiseSocket() {
	console.log("client initialiseSocket() called");
	//var socket;
	socket = io.connect('http://project-skylight.rhcloud.com:8000');
	
	if (socket!==undefined && socket!==null) {
		socket.on('news', function(data) {
			console.log(data);
			socket.emit('my other event', {
				my: 'data'
			});
		});
		
		socket.on('private message', function(message) {
			console.log('I received a private message by ' + message.from +
							' saying ' + message.content);
			if (message.from=='_server' && message.command!==undefined && message.command!==null &&
				message.command.command!==undefined && message.command.command!==null) {
				//handle as a command from the server
				console.log('Command from server: ' + message.command.command);
				switch (message.command.command) {
					case 'refresh' :
						//refresh UI, fields and current state to reflect new info sent from server
						refreshUI(message.command.title,
									message.command.description,
									message.command.email,
									message.command.username,
									message.command.firstname,
									message.command.lastname,
									message.command.userlist,
									message.command.roomlist,
									message.command.currentroom,
									message.command.loggedin
									);
						break;
					case 'updateusername' :
						document.getElementById('outputbox').value += 
							'\n[_server] your username has been changed to: ' + message.content;
						
						//# process parameters from command object now and populate user fields and details
						
						username = message.content;
						break;
					case 'login' :
						document.getElementById('outputbox').value += '\n[_server] you have logged in.';
		
						//process parameters from command object now and populate user fields and details
						updateUserList(message.command.userlist, null);	
						updateRoomList(message.command.roomlist, message.command.room);	
						showLoggedInView(true);
						break;
					case 'logout' :
						document.getElementById('outputbox').value +=
							'\n[_server] you have been logged out.';
						
						//# clean up all user fields and details now
						showLoggedInView(false);
						
						break;
					case 'updatedetails' : 
					
						//# server sends profiles details for user
						
						break;
					case 'updateroom' :
						//server sends room and roomlist that user is currently in
						updateRoomList(message.command.roomlist, message.command.room);						
						break;		
					case 'outputlist' :
						//output a general system and user activity list
						var users = "";
						for (var i=0; i<message.command.details.userlist.length; i++) {
							users += message.command.details.userlist[i].text;
							if (i<message.command.details.userlist.length-1) {
								users += ", ";	
							}
						}
						var rooms = "";
						for (var i=0; i<message.command.details.roomlist.length; i++) {
							rooms += message.command.details.roomlist[i].detail;
							if (i<message.command.details.roomlist.length-1) {
								rooms += ", ";	
							}
						}
						document.getElementById('outputbox').value += '\n[_server] Server Details' +
												'\nversion: ' + message.command.details.version +
												'\ntitle: ' + message.command.details.title + 
												'\ndescription: ' + message.command.details.description +
												'\nusers: ' + users +
												'\nrooms: ' + rooms;
						break;	
					default :
						//handle as a private server message
						document.getElementById('outputbox').value += '\n[' + message.from + '] ' +
							message.content;
						break;
				}
			} else {
				//handle as a private chat message
				document.getElementById('outputbox').value += '\n[' + message.from + '] ' +
					message.content;
			}
		});
		
		socket.on('public message', function(message) {
			console.log('I received a public message by ', message.from, ' saying ', message.content);
			document.getElementById('outputbox').value += '\n[*' + message.from + '] ' +
				message.content;
		});
	}
}

function initInterface() {
	showLoggedInView(false);
	initialiseSocket();
	document.getElementById('outputbox').value = "interface has loaded.";
}
