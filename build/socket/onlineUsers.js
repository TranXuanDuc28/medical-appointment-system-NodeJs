"use strict";

// onlineUsers.js
var onlineUsers = [];
var addUser = function addUser(user, socketId) {
  var isExist = onlineUsers.findIndex(function (item) {
    return item.id === user.id;
  });
  if (isExist !== -1) {
    onlineUsers[isExist].socketId = socketId;
    onlineUsers[isExist].roleId = user.roleId;
  } else {
    user.socketId = socketId;
    onlineUsers.push(user);
  }
  return onlineUsers;
};
var removeUser = function removeUser(socketId) {
  var index = onlineUsers.findIndex(function (item) {
    return item.socketId === socketId;
  });
  if (index !== -1) {
    onlineUsers.splice(index, 1);
  }
};
var getOnlineUsers = function getOnlineUsers() {
  return onlineUsers;
};
module.exports = {
  addUser: addUser,
  removeUser: removeUser,
  getOnlineUsers: getOnlineUsers
};