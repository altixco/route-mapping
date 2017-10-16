var map;
var directionsService;
var directionsDisplay;
var placesService;
var geocoder;
var markerIcons;

var origin = null;
var destination = null;
var waypoints = [];
var routeStopsNames = {
  origin: null,
  destination: null,
  stops: [],
};

var helpText;
var originInput;
var destinationInput;
var currentInput = null;
var currentTag = null;

var isCreate = false;

function initMap() {
  var mapContainer = document.getElementById('map');
  map = new google.maps.Map(mapContainer, {
    zoom: 14,
    center: {lat: 4.1374244, lng: -73.6310358},  // Villavicencio.
    draggableCursor: 'auto',
    draggingCursor: 'move'
  });

  isCreate = mapContainer.hasAttribute("data-iscreate");

  originInput = document.getElementById("route-mapping-origin");
  destinationInput = document.getElementById("route-mapping-destination");
  helpText = document.getElementById("map-help");

  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer({
    draggable: isCreate,
    map: map,
    // markerOptions: {
    //   icon: {
        // url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
        // size: new google.maps.Size(20, 32),
        // origin: new google.maps.Point(0, 0),
        // anchor: new google.maps.Point(0, 32)
    //   }
    // },
    // suppressMarkers: true
  });
  
  placesService = new google.maps.places.PlacesService(map);
  geocoder = new google.maps.Geocoder;

  if (isCreate) {
    directionsDisplay.addListener('directions_changed', function() {
      computeTotalDistance(directionsDisplay.getDirections());
      updateStopsPoints(directionsDisplay.getDirections());
    });

    map.addListener('click', function(e) {
      pointClicked(e, map);
    });
  }

  markerIcons = {
    start: {
      url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
      // This marker is 20 pixels wide by 32 pixels high.
      size: new google.maps.Size(20, 32),
      // The origin for this image is (0, 0).
      origin: new google.maps.Point(0, 0),
      // The anchor for this image is the base of the flagpole at (0, 32).
      anchor: new google.maps.Point(0, 32)
    },
    end: {
     // URL
     url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
     // This marker is 20 pixels wide by 32 pixels high.
     size: new google.maps.Size(20, 32),
     // The origin for this image is (0, 0).
     origin: new google.maps.Point(0, 0),
     // The anchor for this image is the base of the flagpole at (0, 32).
     anchor: new google.maps.Point(0, 32)
    }
  };
}

var marker;
var markers = [];
function pointClicked(e, map) {
  let pointValue = e.placeId ? {placeId: e.placeId} : e.latLng;
  marker = new google.maps.Marker({
    position: e.latLng,
    map: map,
    // icon: {
    //   url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
    //   size: new google.maps.Size(20, 32),
    //   origin: new google.maps.Point(0, 0),
    //   anchor: new google.maps.Point(0, 32),
    //   labelOrigin: new google.maps.Point(20, 20),
    // },
    label: {
      text: "A"
    }
  });
  markers.push(marker);
  // map.panTo(e.latLng);
  if (currentInput !== null) {
    if (currentInput === "origin") {
      if (origin === null) {
        updateStopAddress(e, "origin");
      }
      origin = pointValue;
    }
    else if (currentInput === "destination") {
      if (destination === null) {
        updateStopAddress(e, "destination");
      }
      destination = pointValue;
    }
    else {
      let stops = 0;
      let isNew = true;
      for (let i = 0; i < waypoints.length; i++) {
        if (waypoints[i].stopover) {
          if (stops === currentInput) {
            waypoints[i].location = pointValue;
            isNew = false;
            break;
          }
          stops++;
        }
      }
      if (isNew) {
        waypoints.push({location: pointValue, stopover: true});
      }
      updateStopAddress(e, currentInput);
    }
    currentInput = null;
  }
  else if (origin === null) {
    origin = pointValue;
    updateStopAddress(e, "origin");
  }
  else if (destination === null) {
    destination = pointValue;
  }
  else {
    waypoints.push({location: destination, stopover: false});
    destination = pointValue;
  }
  helpText.innerHTML = "Haz clic en el mapa para agregar un punto a la ruta";
  if (origin !== null && destination !== null) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    displayRoute(origin, destination, waypoints);
  }
}

function originChange() {
  if (originInput.value === "" || originInput.value === undefined) {
    currentInput = "origin";
    helpText.innerHTML = "Haz clic en un punto en el mapa para cambiar el origen";
  }
}

function destinationChange() {
  if (destinationInput.value === "" || destinationInput.value === undefined) {
    currentInput = "destination";
    helpText.innerHTML = "Haz clic en un punto en el mapa para cambiar el destino";
  }
}

function stopChange(stopIndex) {
  var stopInput = document.getElementById("route-mapping-stop-"+stopIndex);
  if (stopInput.value === "" || stopInput.value === undefined) {
    currentInput = stopIndex;
    helpText.innerHTML = "Haz clic en un punto en el mapa para cambiar la parada";
  }
}

function removeStop(stopIndex, button) {
  helpText.innerHTML = "Haz clic en el mapa para agregar un punto a la ruta";
  let stops = 0;
  for (let i = 0; i < waypoints.length; i++) {
    if (waypoints[i].stopover) {
      if (stops === stopIndex) {
        waypoints.splice(i, 1);
        displayRoute(origin, destination, waypoints);
        return;
      }
      stops++;
    }
  }
  button.parentNode.parentNode.removeChild(button.parentNode);
}

function addStop() {
  if (document.getElementById("route-mapping-stop-"+ routeStopsNames.stops.length) !== null) {
    alert("Primera agregue la parada anterior");
    return;
  }
  var stopsContainer = document.getElementById("route-mapping-stops");
  stopsContainer.innerHTML += getStopTemplate(routeStopsNames.stops.length);
  document.getElementById("route-mapping-stop-"+ routeStopsNames.stops.length).click();
}

function getStopTemplate(id, value) {
  var val = "";
  var active = "";
  var letters = "ABCDEFGHIJKLMNOPQRSTVWXYZ"; 
  if (value) {
    val = 'value="'+ value +'"';
    active = 'class="active"';
  }
  return '<div class="input-field">'+
    '<i class="material-icons prefix white-text route-stop-icon">pin_drop</i>'+
    '<input id="route-mapping-stop-'+ id +'" ' + val + ' class="route-stop icon-prefix"' + 
    'type="text" onkeyup="stopChange('+ id +')" onClick="this.select(); stopChange('+ id +');">'+
    '<label for="route-mapping-origin" '+ active +'>' + letters.charAt(id + 1) + '. Parada</label>' +
    '<button onclick="removeStop('+ id +', this)" style="margin-left: 1px;" class="btn-floating tiny transparent waves-effect waves-light"><i class="material-icons white-text" style="">close</i></button>' +
  '</div>';
}

function updateStopAddress(e, currentInput) {
  if (e.placeId) {
    placesService.getDetails({
      placeId: e.placeId
    }, function(place, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        if (currentInput === "origin") {
          setRouteOriginName(place.name);
        }
        else if (currentInput === "destination") {
          setRouteDestinationName(place.name);
        }
        else {
          routeStopsNames.stops[currentInput] = place.name;
        }
        updateInputsAddresses();
      }
    });
  }
  else {
    geocodeLatLng(e.latLng, geocoder, map, function(pointInfo){
      if (pointInfo !== null) {
        if (currentInput === "origin") {
          setRouteOriginName(pointInfo.formatted_address);
        }
        else if (currentInput === "destination") {
          setRouteDestinationName(pointInfo.formatted_address);
        }
        else {
          routeStopsNames.stops[currentInput] = pointInfo.formatted_address;
        }
        updateInputsAddresses();
      }
    });
  }
}

function updateInputsAddresses() {
  originInput.value = getRouteOriginName();
  document.querySelector("label[for=" + originInput.id + "]").className = "active";
  destinationInput.value = getRouteDestinationName();
  var letters = "ABCDEFGHIJKLMNOPQRSTVWXYZ";
  document.querySelector("label[for=" + destinationInput.id + "]").innerHTML = letters.charAt(routeStopsNames.stops.length + 1) + ". Destino"; 
  document.querySelector("label[for=" + destinationInput.id + "]").className = "active";
  var stopsContainer = document.getElementById("route-mapping-stops");
  stopsContainer.innerHTML = "";
  for (var i = 0; i < routeStopsNames.stops.length; i++) {
    stopsContainer.innerHTML += getStopTemplate(i, routeStopsNames.stops[i]);
  }
}

function displayRoute(origin, destination, waypoints) {
  directionsService.route({
    origin: origin,
    destination: destination,
    waypoints: waypoints,
    travelMode: 'DRIVING',
    avoidTolls: false
  }, function(response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      if (status === "MAX_WAYPOINTS_EXCEEDED") {
        alert("Ha excedido el máximo de puntos en la ruta");
      }
      else {
        alert('No se puede mostrar la ruta debido a: ' + status);
      }
    }
  });
}

function geocodeLatLng(latLng, geocoder, map, callback) {
  geocoder.geocode({'location': latLng}, function(results, status) {
    if (status === 'OK') {
      if (results[1]) {
        callback(results[1]);
      } else {
        window.alert('No hay resultados');
        callback(null);
      }
    } else {
      window.alert('Fallo en localización por: ' + status);
      callback(null);
    }
  });
}

var markersMap = [];
function updateStopsPoints(result) {
  origin = result.request.origin;
  destination = result.request.destination;
  waypoints = result.request.waypoints;

  // for (var i = 0; i < markersMap.length; i++) {
  //   markersMap[i].setMap(null);
  // }
  // markersMap = [];

  var route = result.routes[0];
  routeStopsNames.stops = [];
  var currentLocation;
  var currentDest;
  for (var i = 0; i < route.legs.length; i++) {
    if (i === 0) {
      if (routeStopsNames.origin === null || !routeStopsNames.origin.isLabel) {
        setRouteOriginName(route.legs[i].start_address);
      }
      // makeMarker(route.legs[i].start_location, markerIcons.start, "Start");
    }
    if (i === 0) {
      if (routeStopsNames.destination === null || !routeStopsNames.destination.isLabel) {
        setRouteDestinationName(route.legs[i].end_address);
      }
      currentDest = route.legs[i].end_address;
    }
    else {
      routeStopsNames.stops.push(currentDest);
      if (routeStopsNames.destination === null || !routeStopsNames.destination.isLabel) {
        setRouteDestinationName(route.legs[i].end_address);
      }
      currentDest = route.legs[i].end_address;
      // makeMarker(currentLocation, markerIcons.start, "Stop");
    }
    // currentLocation = route.legs[i].end_location;
  }
  // makeMarker(currentLocation, markerIcons.end, "End");
  updateInputsAddresses();
}

function makeMarker(position, icon, title) {
  var shape = {
    coords: [1, 1, 1, 20, 18, 20, 18, 1],
    type: 'poly'
  };
 let newMarker = new google.maps.Marker({
  position: position,
  map: map,
  icon: icon,
  title: title,
  draggable: true,
  shape: shape
 });
 markersMap.push(newMarker);
}

function computeTotalDistance(result) {
  var total = 0;
  var myroute = result.routes[0];
  for (var i = 0; i < myroute.legs.length; i++) {
    total += myroute.legs[i].distance.value;
  }
  total = total / 1000;
  total = Math.round(total * 100) / 100;
  document.getElementById('route-mapping-total').innerHTML = total + ' km';
}

function setRouteOriginName(value, isLabel) {
  isLabel = typeof isLabel !== 'undefined' ? isLabel : false;
  routeStopsNames.origin = {
    value: value,
    isLabel: isLabel
  };
}

function getRouteOriginName() {
  if (routeStopsNames.origin === null) 
    return null;
  return routeStopsNames.origin.value;
}

function setRouteDestinationName(value, isLabel) {
  isLabel = typeof isLabel !== 'undefined' ? isLabel : false;
  routeStopsNames.destination = {
    value: value,
    isLabel: isLabel
  };
}

function getRouteDestinationName() {
  if (routeStopsNames.destination === null) 
    return null;
  return routeStopsNames.destination.value;
}

function getRouteToSave() {
  let routeData = {
    origin: origin,
    destination: destination,
    waypoints: waypoints,
    stopsNames: routeStopsNames
  }
  return JSON.stringify(routeData);
}

function addTagToOrigin() {
  currentTag = "origin";
  if (routeStopsNames.origin.isLabel) {
    document.getElementById("route-tag-input").value = getRouteOriginName();
  }
  else {
    document.getElementById("route-tag-input").value = "";
  }
}

function addTagToDestination() {
  currentTag = "destination";
  if (routeStopsNames.destination.isLabel) {
    document.getElementById("route-tag-input").value = getRouteDestinationName();
  }
  else {
    document.getElementById("route-tag-input").value = "";
  }
}

function addTag() {
  var tag = document.getElementById("route-tag-input").value;
  if (tag === undefined || tag === null) {
    return;
  }
  if (currentTag === "origin") {
    setRouteOriginName(tag, tag !== "");
  }
  else if (currentTag === "destination") {
    setRouteDestinationName(tag, tag !== "");
  }
  updateStopsPoints(directionsDisplay.getDirections());
}

function showSavedRoute(routeData) {
  routeData = JSON.parse(routeData);
  let waitInterval = setInterval(function(){
    if (directionsService !== undefined) {
      displayRoute(routeData.origin, routeData.destination, routeData.waypoints);
      window.clearInterval(waitInterval);
    }
  }, 100);
}

$(document).ready(function(){
  // the "href" attribute of the modal trigger must specify the modal ID that wants to be triggered
  $('#modal-tags').modal();
});

