@echo off
rem FocusDog Native Messaging Forwarder
rem Reads 4-byte length-prefixed stdin from Chrome/Edge and forwards via TCP loopback to 127.0.0.1:42123
node "%~dp0forwarder.js"
