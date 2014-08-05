skylight-project
================

This project is currently under active development and is not yet released for production use.

Node.js template using the RedHat OpenShift cloud platform for delivery. This template implements the basics features required by every medium-sized application, to allow easy extension and development of actual applications. Why reinvent the wheel for every application?

Features:

Utilises the RedHat OpenShift system which is free for limited use.

Implemented using:
-	Node.js v0.10 - to allow quick and efficient non-blocking communications between multiple clients and the server
-	express - to display html content
-	socket.io v0.9.16 - to allow socket communications between multiple clients and the server
-	ws v0.4.31 - to allow web socket communications
-	xml2js - to parse xml files for use within Node.js
-	nodemailer v1.0 - for sending email notifications from the server to reset passwords
-	fs - local file reading
-	path - dealing with local urls
-	url - deal with url string and parameters
	
Server-side XML file saving and loading of the state of the system to allow retrieval of the system after a shutdown.

Visual UI for client input

Command-line UI for client and automated input

HTML paramaters for server to server communication

Multiple user chat with ability to change rooms and communicate on a public, room, and private level
