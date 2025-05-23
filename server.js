/*
*@autor: IWAY Studios
*@description:  java script server that works as master server of the metaverse from WebGL Multiplayer Kit
*/
var express  = require('express');//import express NodeJS framework module
var app      = express();// create an object of the express module
var http     = require('http').Server(app);// create a http web server using the http library
var io       = require('socket.io')(http);// import socketio communication module
const { v4: uuidv4 } = require('uuid');


const cors=require("cors");
const corsOptions ={
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200
}

app.use(cors(corsOptions)) // Use this after the variable declaration

app.use("/public/TemplateData",express.static(__dirname + "/public/TemplateData"));
app.use("/public/Build",express.static(__dirname + "/public/Build"));
app.use(express.static(__dirname+'/public'));

var clients			= [];// to storage clients
var clientLookup = {};// clients search engine
var sockets = {};//// to storage sockets

var vehicles = [];
var vehicleLookup = {};



function getDistance(x1, y1, x2, y2){
    let y = x2 - x1;
    let x = y2 - y1;
    
    return Math.sqrt(x * x + y * y);
}


//open a connection with the specific client
io.on('connection', function(socket){

   //print a log in node.js command prompt
  console.log('A user ready for connection!');
  
  //to store current client connection
  var currentUser;
  
  var sended = false;
  
  var muteAll = false;
	
	
	//create a callback fuction to listening EmitPing() method in NetworkMannager.cs unity script
	socket.on('PING', function (_pack)
	{
	  //console.log('_pack# '+_pack);
	  var pack = JSON.parse(_pack);	

	    console.log('message from user# '+socket.id+": "+pack.msg);
        
		 //emit back to NetworkManager in Unity by client.js script
		 socket.emit('PONG', socket.id,pack.msg);
		
	});
	
	//create a callback fuction to listening EmitJoin() method in NetworkMannager.cs unity script
	socket.on('JOIN', function (_data)
	{
	
	    console.log('[INFO] JOIN received !!! ');
		
		var data = JSON.parse(_data);

         // fills out with the information emitted by the player in the unity
        currentUser = {
			       name:data.name,
				   publicAddress: data.publicAddress,
				   model:data.model,
                   posX:data.posX,
				   posY:data.posY,
				   posZ:data.posZ,
				   rotation:'0',
			       id:socket.id,//alternatively we could use socket.id
				   socketID:socket.id,//fills out with the id of the socket that was open
				   muteUsers:[],
				   muteAll:false,
				   isMute:true
				   };//new user  in clients list
					
		console.log('[INFO] player '+currentUser.name+': logged!');
		

		 //add currentUser in clients list
		 clients.push(currentUser);
		 
		 //add client in search engine
		 clientLookup[currentUser.id] = currentUser;
		 
		 sockets[currentUser.id] = socket;//add curent user socket
		 
		 console.log('[INFO] Total players: ' + clients.length);
		 
		 
		 /*********************************************************************************************/		
		
		//send to the client.js script
		socket.emit("JOIN_SUCCESS",currentUser.id,currentUser.name,currentUser.posX,currentUser.posY,currentUser.posZ,data.model);
		
         //spawn all connected clients for currentUser client 
         clients.forEach( function(i) {
		    if(i.id!=currentUser.id)
			{ 
		      //send to the client.js script
		      socket.emit('SPAWN_PLAYER',i.id,i.name,i.posX,i.posY,i.posZ,i.model);
			  
		    }//END_IF
	   
	     });//end_forEach
		
		 // spawn currentUser client on clients in broadcast
		socket.broadcast.emit('SPAWN_PLAYER',currentUser.id,currentUser.name,currentUser.posX,currentUser.posY,currentUser.posZ,data.model);
		
		
	
		
		 
				 

		
  
	});//END_SOCKET_ON
	
	
	
	

	
		
	//create a callback fuction to listening EmitMoveAndRotate() method in NetworkMannager.cs unity script
	socket.on('MOVE_AND_ROTATE', function (_data)
	{
	  var data = JSON.parse(_data);	
	  
	  if(currentUser)
	  {
	
       currentUser.posX= data.posX;
	   currentUser.posY = data.posY;
	   currentUser.posZ = data.posZ;
	   
	   currentUser.rotation = data.rotation;
	  
	   // send current user position and  rotation in broadcast to all clients in game
       socket.broadcast.emit('UPDATE_MOVE_AND_ROTATE', currentUser.id,currentUser.posX,currentUser.posY,currentUser.posZ,currentUser.rotation);
	
      
       }
	});//END_SOCKET_ON
	
		
//create a callback fuction to listening EmitAnimation() method in NetworkMannager.cs unity script
	socket.on('ANIMATION', function (_data)
	{
	  var data = JSON.parse(_data);	
	  
	  if(currentUser)
	  {
	   
	   currentUser.timeOut = 0;
	   
	    //send to the client.js script
	   //updates the animation of the player for the other game clients
       socket.broadcast.emit('UPDATE_PLAYER_ANIMATOR', currentUser.id,data.key,data.value,data.type);
	
	   
      }//END_IF
	  
	});//END_SOCKET_ON
	
	
	socket.on('PICK_VEHICLE', function (_data)
	{
		
		var data = JSON.parse(_data);	
		
		 //console.log("data id : "+data.id);
		
		 //spawn all connected clients for currentUser client 
        vehicles.forEach( function(i) {
		    if(i.id==data.id)
			{ 
		      i.currentState = "bussy";
			  i.myClientId = currentUser.id;
			  i.charModel = currentUser.model;
		      //send to the client.js script
			  socket.broadcast.emit('UPDATE_VEHICLE_STATE', currentUser.id,i.id,i.currentState);
			  
		    }//END_IF
	   
	     });//end_forEach
	
    });

   socket.on('RELEASE_VEHICLE', function (_data)
	{
		
		var data = JSON.parse(_data);	
		
		 //spawn all connected clients for currentUser client 
        vehicles.forEach( function(i) {
		    if(i.id==data.vehicleId)
			{ 
		      i.currentState = "available";
			  i.myClientId = '';
			  i.isLocalVehicle = false;
		       //send to the client.js script
			  socket.broadcast.emit('UPDATE_VEHICLE_STATE',  currentUser.id,i.id,i.currentState);
			  
		    }//END_IF
	   
	     });//end_forEach
	
    });
	
	
		
	//create a callback fuction to listening EmitMoveAndRotate() method in NetworkMannager.cs unity script
	socket.on('UPDATE_VEHICLE_POS_AND_ROT', function (_data)
	{
	  var data = JSON.parse(_data);	
	  
	 
	  
	
	  
	   vehicles.forEach( function(i) {
		    if(i.id==data.id)
			{ 
			  i.posX= data.posX;
	          i.posY = data.posY;
	          i.posZ = data.posZ;
	          i.rotation = data.rotation;
			  i.spherePosX= data.spherePosX;
	          i.spherePosY = data.spherePosY;
	          i.spherePosZ = data.spherePosZ;
			  
			
			  
			//  socket.broadcast.emit('EMIT_VEHICLE_POS_AND_ROT', i.id,i.posX,i.posY,i.posZ,i.rotation);
			
			  
              clients.forEach(function(u) {

              if(u.id!= currentUser.id)
              {
				   
		        sockets[u.id].emit('EMIT_VEHICLE_POS_AND_ROT', i.id,i.posX,i.posY,i.posZ,i.rotation,i.spherePosX,i.spherePosY,i.spherePosZ);
               }
	  
              });
			  
		    }//END_IF
		});//end_forEach
		
	 
	  
	  
	
	});//END_SOCKET_ON
	
	 socket.on('ACCELERATION', function (_data)
	{
		
		var data = JSON.parse(_data);	
		
		 //spawn all connected clients for currentUser client 
        vehicles.forEach( function(i) {
		    if(i.id==data.id)
			{ 
		      i.acceleration = data.acceleration;
			  
		       //send to the client.js script
			  socket.broadcast.emit('UPDATE_VEHICLE_ACCELERATION',  i.id,i.acceleration);
			  
		    }//END_IF
	   
	     });//end_forEach
	
    });
	
	 socket.on('OFFSPIN', function (_data)
	{
		
		var data = JSON.parse(_data);	
		
		 //spawn all connected clients for currentUser client 
        vehicles.forEach( function(i) {
		    if(i.id==data.id)
			{ 
		      i.offSpin = data.offSpin;
			  
		       //send to the client.js script
			  socket.broadcast.emit('UPDATE_OFFSPIN',  i.id,i.offSpin);
			  
		    }//END_IF
	   
	     });//end_forEach
	
    });
	
	 socket.on('FRONT_WHEELS_ROT', function (_data)
	{
		
		var data = JSON.parse(_data);	
		
		 //spawn all connected clients for currentUser client 
        vehicles.forEach( function(i) {
		    if(i.id==data.id)
			{ 
		      i.wheels_rot = data.wheels_rot;
			  
		       //send to the client.js script
			  socket.broadcast.emit('UPDATE_FRONT_WHEELS_ROT',  i.id, i.wheels_rot);
			  
		    }//END_IF
	   
	     });//end_forEach
	
    });
	
	 socket.on('VEHICLE_INPUTS', function (_data)
	{
		
		var data = JSON.parse(_data);	
		
		 //spawn all connected clients for currentUser client 
        vehicles.forEach( function(i) {
		    if(i.id==data.id)
			{ 
		      
			  
		       //send to the client.js script
			  socket.broadcast.emit('UPDATE_VEHICLE_INPUTS',  i.id, data.h,data.v);
			  
		    }//END_IF
	   
	     });//end_forEach
	
    });

	
	
	
//create a callback fuction to listening EmitGetBestKillers() method in NetworkMannager.cs unity script
socket.on('GET_USERS_LIST',function(pack){

   if(currentUser)
   {
       //spawn all connected clients for currentUser client 
        clients.forEach( function(i) {
		    if(i.id!=currentUser.id)
			{ console.log("name: "+i.name);
		      //send to the client.js script
		      socket.emit('UPDATE_USER_LIST',i.id,i.name,i.publicAddress);
			  
		    }//END_IF
	   
	     });//end_forEach
   
   }
  

});//END_SOCKET.ON


		
	//create a callback fuction to listening EmitMoveAndRotate() method in NetworkMannager.cs unity script
	socket.on('MESSAGE', function (_data)
	{
		
		
	  var data = JSON.parse(_data);	
	  
	  
	  if(currentUser)
	  {
	    // send current user position and  rotation in broadcast to all clients in game
       socket.emit('UPDATE_MESSAGE', currentUser.id,data.message);
	   // send current user position and  rotation in broadcast to all clients in game
       socket.broadcast.emit('UPDATE_MESSAGE', currentUser.id,data.message);
	
      
       }
	});//END_SOCKET_ON
	


	
	//create a callback fuction to listening EmitMoveAndRotate() method in NetworkMannager.cs unity script
	socket.on('PRIVATE_MESSAGE', function (_data)
	{
		
		
	  var data = JSON.parse(_data);	
	  
	  
	  if(currentUser)
	  {
	
	    // send current user position and  rotation in broadcast to all clients in game
        socket.emit('UPDATE_PRIVATE_MESSAGE', data.chat_box_id, currentUser.id,data.message);
	 
	    sockets[data.guest_id].emit('UPDATE_PRIVATE_MESSAGE',data.chat_box_id, currentUser.id,data.message);
	
      }
	});//END_SOCKET_ON
	
	//create a callback fuction to listening EmitMoveAndRotate() method in NetworkMannager.cs unity script
	socket.on('SEND_OPEN_CHAT_BOX', function (_data)
	{
		
		
	  var data = JSON.parse(_data);	

	  console.log('[INFO] Player_id: ' + data.player_id);
	  
	  
	  if(currentUser)
	  {
	
	   // send current user position and  rotation in broadcast to all clients in game
       socket.emit('RECEIVE_OPEN_CHAT_BOX', currentUser.id,data.player_id);
	   
	   
	     //spawn all connected clients for currentUser client 
         clients.forEach( function(i) {
		    if(i.id==data.player_id)
			{ 
		      console.log("[INFO] send to : "+i.name);
			  process.stdout.write("TEST\n");
		      //send to the client.js script
		      sockets[i.id].emit('RECEIVE_OPEN_CHAT_BOX',currentUser.id,i.id);
			  
		    }//END_IF
	   
	     });//end_forEach
	
      
       }
	});//END_SOCKET_ON
	
	

	
	socket.on('MUTE_ALL_USERS', function ()
	{
			

	  if(currentUser )
      {
		currentUser.muteAll = true;
		clients.forEach(function(u) {
			 
		currentUser.muteUsers.push( clientLookup[u.id] );
			
			 
		 });
		
		  
	  }
	  
	  
	
     
	});//END_SOCKET_ON
	
	
	socket.on('REMOVE_MUTE_ALL_USERS', function ()
	{
			

	  if(currentUser )
      {
		currentUser.muteAll = false;
		while(currentUser.muteUsers.length > 0) {
         currentUser.muteUsers.pop();
        }
		
		  
	  }
	  
	  
	
     
	});//END_SOCKET_ON
	
	socket.on('ADD_MUTE_USER', function (_data)
	{
			
	  var data = JSON.parse(_data);	
	  
	  if(currentUser )
      {
		//console.log("data.id: "+data.id);
		console.log("add mute user: "+clientLookup[data.id].name);
		currentUser.muteUsers.push( clientLookup[data.id] );
		  
	  }
	  
	  
	
     
	});//END_SOCKET_ON
	
	socket.on('REMOVE_MUTE_USER', function (_data)
	{
			
	  var data = JSON.parse(_data);	
	  
	  if(currentUser )
      {
		
		 for (var i = 0; i < currentUser.muteUsers.length; i++)
		 {
			if (currentUser.muteUsers[i].id == data.id) 
			{

				console.log("User "+currentUser.muteUsers[i].name+" has removed from the mute users list");
				currentUser.muteUsers.splice(i,1);

			};
		};
		  
	  }
	  
	  
	
     
	});//END_SOCKET_ON
	
	
	
	
	
 socket.on("VOICE", function (data) {
		
		var minDistanceToPlayer = 3;
		


  if(currentUser )
  {
	  
	  
   
   var newData = data.split(";");
   
    newData[0] = "data:audio/ogg;";
    newData = newData[0] + newData[1];

     
    clients.forEach(function(u) {
		
		var distance = getDistance(parseFloat(currentUser.posX), parseFloat(currentUser.posY),parseFloat(u.posX), parseFloat(u.posY))
		
		var muteUser = false;
		
		 for (var i = 0; i < currentUser.muteUsers.length; i++)
		 {
			if (currentUser.muteUsers[i].id == u.id) 
			{
				
				muteUser = true;


			};
		};
		
	//console.log("distance: "+distance);
	
	 // console.log("mute user: "+muteUser);
     
      if(sockets[u.id]&&u.id!= currentUser.id&&!currentUser.isMute&& distance < minDistanceToPlayer &&!muteUser &&! sockets[u.id].muteAll)
      {
		//  console.log("current user: "+currentUser.name);
		  
		// console.log("u.name: "+u.name);
     
    
        //sockets[u.id].emit('UPDATE_VOICE',currentUser.id,newData);
		 sockets[u.id].emit('UPDATE_VOICE',newData);
		 
		
         sockets[u.id].broadcast.emit('SEND_USER_VOICE_INFO', currentUser.id);
	
      }
	  
    });
    
    

  }
 
});



socket.on("AUDIO_MUTE", function (data) {

if(currentUser)
{
  currentUser.isMute = !currentUser.isMute;

}

});
	

    // called when the user desconnect
	socket.on('disconnect', function ()
	{
     
	    if(currentUser)
		{
		 currentUser.isDead = true;
		 
		 //send to the client.js script
		 //updates the currentUser disconnection for all players in game
		 socket.broadcast.emit('USER_DISCONNECTED', currentUser.id);
		
		
		 for (var i = 0; i < clients.length; i++)
		 {
			if (clients[i].name == currentUser.name && clients[i].id == currentUser.id) 
			{

				console.log("User "+clients[i].name+" has disconnected");
				clients.splice(i,1);

			};
		};
		
		}
		
    });//END_SOCKET_ON
		
});//END_IO.ON

function gameloop() {
	

	  //spawn all connected clients for currentUser client 
         clients.forEach( function(u) {
		    
		
		    //spawn all connected clients for currentUser client 
         vehicles.forEach( function(i) {
			 

		
		
		     sockets[u.socketID].emit('SPAWN_VEHICLE',i.id,i.name,i.model,i.posX,i.posY,i.posZ,i.currentState,i.myClientId);
		     
		     //send to the client.js script
			 sockets[u.socketID].emit('UPDATE_VEHICLE_STATE', i.myClientId,i.id,i.currentState);
			  
			  
	   
	     });//end_forEach
		});//end_forEach
		 
		 
		 
}

setInterval(gameloop, 1000);
// Adicionando a propriedade posY no array vehicleTypes
const vehicleTypes = [
  { name: 'motorcycle', model: 0},
  { name: 'car', model: 1}

];

function createVehicle(name, model, posX, posY, posZ) {
  return {
    id: uuidv4(),
    name: name,
    model: model,
    charModel: model.toString(),
    isLocalVehicle: false,
    posX: posX.toString(),
    posY: posY.toString(),
    posZ: posZ.toString(),
    spherePosX: '',
    spherePosY: '',
    spherePosZ: '',
    defaultPosition: `${posX},${posY},${posZ}`,
    rotation: '',
    acceleration: '',
    offSpin: '',
    wheels_rot: '',
    currentState: 'available',
    myClientId: '',
    bornPointID: 1
  };
}

function generateRandomPosition(vehicleType) {
  return {
    x: (Math.random() * 100 - 50).toFixed(2), // Random X position between -50 and 50
    y:0,
    z: (Math.random() * 100 - 50).toFixed(2) // Random Z position between -50 and 50
  };
}



// Criar múltiplos veículos com repetições
for (let i = 0; i < 10; i++) { // Ajustar o número de veículos conforme necessário
  const randomType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
  const randomPos = generateRandomPosition(randomType);
  
  const vehicle = createVehicle(randomType.name, randomType.model, randomPos.x, randomPos.y, randomPos.z);
  vehicles.push(vehicle);
  vehicleLookup[vehicle.id] = vehicle;
}


console.log('Vehicles:', vehicles);

http.listen(process.env.PORT ||3000, function(){
	console.log('listening on *:3000');
});
console.log("------- server is running -------");