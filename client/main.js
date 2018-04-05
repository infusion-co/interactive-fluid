// Packages
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import $ from 'jquery';
import loadTouchEvents from 'jquery-touch-events';
loadTouchEvents($);

import _ from 'underscore';
import Tone from 'tone';

// Related dependencies
import './main.css';
import '/imports/routes.js';

import {perc2color, hexToRGB} from '/imports/utils.js';

// Libs
import {streamChannel } from '/imports/MainStream.js';
import {colorInfos, streamColorInfos } from '/imports/MainColorInfos.js';
import { default as FluidApp } from '/imports/Fluid/FluidApp.js';

import { initAudio, createUser } from '/imports/AudioApp.js';

// change simulation ORIGINAL_APP / NEW_APP
let CURRENT_FLUID_APP = FluidApp.FLUID_SIMULATION_APPS_KEY.ORIGINAL_APP;

// switch back to old audio system (colorInfos)
const USE_STREAM_COLOR = true;

// Enable kick and bass base loop
const ENABLE_KICK_LOOP = false;

const DEBUG = false;

// === FLUID PAGE
const loadUser = (userColor) => (_.extend({
  color: userColor.color
}, createUser(userColor)));

Template.fluid.onCreated(function fluidOnCreated() {
  this.users = {};

  this.backgroundColor = new ReactiveVar('#00ffed');
  this.fluidApp = new FluidApp();

  const drawStream = (streamEvent) => {
    const {
      uuid, 
      eventType, 
      color, 
      xPc, 
      yPc
    } = streamEvent;

    const width = $(window).width();
    const height = $(window).height();

    const { colorCode, voice, fluidParams } = _.find(colorInfos, colorInfo => colorInfo.color === color);

    const goodEventType = voice === 'sampler' ? 'tap' : eventType;

    const fluidControl = fluidParams;

    x = xPc * width;
    y = yPc * height;

    this.fluidApp.handleEvents( x, y, colorCode, goodEventType, uuid, fluidControl );
  }

  const handleStreamEvent = (streamEvent) => {
    const {
      uuid, 
      eventType, 
      color, 
      xPc, 
      yPc
    } = streamEvent;  

    if (DEBUG) console.log(streamEvent);

    let user = this.users[uuid];

    if (!user) {
      const colorInfo = _.find(colorInfos, (colorInfo) => colorInfo.color === color);

      user = loadUser(colorInfo);

      this.users[uuid] = user;
    }

    if(!user) return;

    user.handleEvent(streamEvent);
    drawStream(streamEvent);
  }

  streamChannel.subscribe('streamEvents', ({data: streamEvent}) => {
    if (DEBUG) console.log('stream event received');
    handleStreamEvent(streamEvent);
  })
});


Template.fluid.onRendered(function fluidOnRendered() {
  const onNoteHook = (noteAndOctave, number) => {
    const totalNotes = 120;
    const hexColor = perc2color(100 * number / totalNotes);
    const {red, green, blue} = hexToRGB(hexColor);
    console.log(number);
    console.log(hexColor);
    console.log(red, green, blue);
    this.fluidApp.setBackgroundColor(red/255, green/255, blue/255);
    this.backgroundColor.set(hexColor);
  };

  ///////////////////
  // LOADING AUDIO //
  ///////////////////
  initAudio('sounds', ENABLE_KICK_LOOP, {
    onMidiNotePlayed: onNoteHook,
  });

  ///////////////////
  // LOADING FLUID //
  ///////////////////
  this.fluidApp.init();
  this.fluidApp.run( CURRENT_FLUID_APP );
});

Template.fluid.helpers({
  'backgroundColor'() {
    return Template.instance().backgroundColor.get();
  },
})
