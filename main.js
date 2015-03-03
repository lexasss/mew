/*! Namespace
 *  Must be defined/loaded before any other script
 */

 if ( !MEW ) {
    var MEW = { };
}

/*! Various utils
 *
 *  Singleton
 *  Usage: MEW.Utils.<method>
 */

(function (app) {
    'use strict';

    var Utils = { };
        
    /*! Modified 'extend' from
     * jQuery JavaScript Library v2.0.3, by jQuery Foundation, Inc. and other contributors, http://jquery.com/
     */
    Utils.extend = function()
    {
        var isPlainObject = function( obj ) {
            if ( typeof obj !== 'object' || obj.nodeType || obj === obj.window ) {
                return false;
            }

            return true;
        };
        
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false,
            onlyIfUndefined = false;

        // Handle a deep copy situation
        if ( typeof target === 'boolean' ) {
            deep = target;
            target = arguments[i] || {};
            // skip the boolean and the target
            i += 1;
        }

        if ( typeof target === 'boolean' ) {
            onlyIfUndefined = target;
            target = arguments[i] || {};
            i += 1;
        
        }
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== 'object' && typeof target !== 'function' ) {
            
            target = {};
        }

        if ( length === i ) {
            return target;
        }

        for ( ; i < length; i += 1 ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) !== null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];

                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = Array.isArray(copy)) ) ) {
                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : [];

                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[ name ] = Utils.extend( deep, clone, copy );

                    // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        if (!onlyIfUndefined || target[ name ] === undefined) {
                            target[ name ] = copy;
                        }
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };
        
    Utils.clone = function ( aObject )
    {
        if ( aObject === null ) {
            return null;
        }
        var copy = aObject.constructor();
        for ( var attr in aObject ) {
            copy[ attr ] = aObject[ attr ];
        }
        return copy;
    };

    Utils.limit = function( aValue, aMin, aMax ) {
        return Math.max( Math.min( aValue, aMax ), aMin );
    };

    Utils.randomInRange = function( aMin, aMax ) {
        return Math.random() * ( aMax - aMin ) + aMin;
    };

    app.Utils = Utils;

})( MEW );

/*! Common parent for animals
 *
 *  Usage: not to be used directly, only as a parent
 */
 
(function (app) {
    'use strict';

    // common for animals
    var iOptions = {
        stageDuration: {
            minimum: 350,
            maximum: 450
        },
        
        canGrowInWater: false,
        canGrowInSoil: true,

        maxDeliveryCount: 3,
        maxChildren: 5,

        energy: {
            minToDeliver: 0.3,
            maximum: 1.5,
            decreasePerStep: 0.0025,
            infectionDecrease: 0.005,
            aliveThreshold: 0.1,
            hungerThreshold: 0.8,    // energy, relative to the max energy
            foodRate: 3              // relation between victim energy/size and energy amount the animal gets
        },

        victimSearchSkippingSteps: 5,
        relaxedSpeed: 0.25,      // relative to the max speed

        chaserNotifyingDistance: 40, // pixels, 0 to disable
        chasingScale: 1
    };

    // aGenes as app.Genes object for plants
    // aCell as {col, row}
    // aOptions as extended iOptions in the descendant class
    function Animal( aGenes, aCell, aOptions )
    {
        // read-only for externals (exept for initialization phase)
        this.ID = sID;
        this.cell = aCell;
        this.coords = { x: 0, y: 0 };
        this.age = Animal.Age.BABY;
        this.lastMoveAngle = Math.random() * Math.PI * 2;
        this.lastNearestVictim = null;
        this.isVisble = true;
        this.isInfected = false;

        // internals
        this.iOptions = aOptions;
        this.iGenes = aGenes;
        
        this.iChildren = [];
        this.iDeliveryCount = 0;
        this.iTotalDelivered = 0;
        
        this.iCurrentStageAge = 0;
        this.iStageDuration = aOptions ? app.Utils.randomInRange( this.iOptions.stageDuration.minimum, this.iOptions.stageDuration.maximum ) : 
                                         app.Utils.randomInRange( iOptions.stageDuration.minimum, iOptions.stageDuration.maximum );
        this.iEnergy = aOptions ? app.Utils.randomInRange( this.iOptions.energy.maximum / 2, this.iOptions.energy.maximum ) : 1;    // 0 .. 1
        this.iMaxEnergy = aGenes ? aGenes.set.size * this.iOptions.energy.maximum : 1;
        
        this.iMoveSpeed = 0;
        
        this.iVictim = null;
        this.iVictimSearchSkippingStepsLeft = 0;
        this.iUnreachableVictimIDs = {};

        this.iChasers = {};
        this.iChasersCount = 0;

        // finilize init
        sID += 1;
    }

    Animal.prototype.getEnergy = function () {
        return this.iEnergy / this.iMaxEnergy;
    };

    Animal.prototype.looseEnergy = function ( aAmount ) {
        this.iEnergy -= aAmount;
    };

    Animal.prototype.getSensorSize = function () {
        return this.iGenes.set.sensorSize;
    };

    Animal.prototype.getGenes = function () {
        return this.iGenes.set;
    };

    Animal.prototype.getMass = function () {
        return this.iGenes.set.size * ( Math.min( this.age + 1, Animal.Age.MATURED) / Animal.Age.MATURED );
    };

    Animal.prototype.increaseAge = function ()
    {
        this.iEnergy += calcEnergyChange.call( this );
        if ( this.iVictim ) {
            if ( this.iEnergy >= this.iMaxEnergy || this.iVictim.energy < 0.01 ) {
                this.iVictim = null;
            }
        }
        this.iEnergy = app.Utils.limit( this.iEnergy, 0.001, this.iMaxEnergy );

        if ( this.getEnergy() < this.iOptions.energy.aliveThreshold && this.age < Animal.Age.SENIOUR )
        {
            this.iCurrentStageAge = 0;
            if ( this.age <= Animal.Age.YOUTH ) {
                this.age = Animal.Age.OLD;
            } else {
                this.age = Animal.Age.SENIOUR;
            }
        }

        if ( this.age < Animal.Age.SENIOUR ) {
            this.iCurrentStageAge += 5 / ( 4 + this.getEnergy() );
        } else {
            this.iCurrentStageAge += 2 / ( 1 + this.getEnergy() );
        }

        if ( this.iCurrentStageAge >= this.iStageDuration )
        {
            if ( this.age === Animal.Age.DELIVERED && this.iDeliveryCount < this.iOptions.maxDeliveryCount && !this.isInfected )
            {
                this.age = Animal.Age.MATURED;
                this.iDeliveryCount += 1;
            } else {
                this.age += 1;
            }

            if ( this.age === Animal.Age.MATURED && this.getEnergy() >= this.iOptions.energy.minToDeliver )
            {
                var count = tryToDeliverChildren.call( this );
                this.iTotalDelivered += count;
                if ( count )
                {
                    this.age = Animal.Age.DELIVERED;
                    this.iCurrentStageAge = 0;
                }
            }

            this.iCurrentStageAge = 0;
        }
    };

    Animal.prototype.moveTo = function ( aNewCoords, aNewCell, aMoveAngle, aIsWaterCell )
    {
        var canLiveInNewCell = ( aIsWaterCell && this.iOptions.canGrowInWater ) ||
                               ( !aIsWaterCell && this.iOptions.canGrowInSoil );
        if ( canLiveInNewCell ) {
            this.coords = aNewCoords;
            this.cell = aNewCell;
            this.lastMoveAngle = aMoveAngle;
        }
        else {
            this.lastMoveAngle += Math.PI / 2 + Math.random() * Math.PI;
        }

        return canLiveInNewCell;
    };

    Animal.prototype.setVictim = function ( aHasMoved, aNearestVictim )
    {
        if ( aHasMoved )
        {
            this.lastNearestVictim = aNearestVictim;
            if ( this.lastNearestVictim.addChaser ) {
                this.lastNearestVictim.addChaser( this.ID, this.lastMoveAngle, this.coords );
            }
            this.iVictimSearchSkippingStepsLeft = this.iOptions.victimSearchSkippingSteps;
        }
        else
        {
            if ( this.lastNearestVictim && this.lastNearestVictim.removeChaser ) {
                this.lastNearestVictim.removeChaser( this.ID );
            }
            this.lastNearestVictim = null;
            this.iUnreachableVictimIDs[ 'v' + aNearestVictim.ID ] = true;
        }
    };

    Animal.prototype.getMoveSpeed = function ()
    {
        var ageScale = 1;
        if ( this.age === Animal.Age.BABY ) {
            ageScale = 0.5;
        } else if ( this.age === Animal.Age.CHILD ) {
            ageScale = 0.7;
        } else if ( this.age === Animal.Age.YOUTH ) {
            ageScale = 0.9;
        }

        var huntingScale = this.isChased() ? 1 : ( this.isHungry() ? 3 / ( 3 + this.getEnergy() ) : this.iOptions.relaxedSpeed );
        if ( this.iVictim ) {
            huntingScale *= this.iOptions.chasingScale;
        }
        var moveSpeed = Math.max( 0, -0.2 + 0.3 * Math.random() + // app.Utils.randomInRange( -0.2, 0.1 ) +
            this.iGenes.set.moveSpeed * 
            ageScale *
            huntingScale *
            Math.pow( this.getEnergy(), 0.25 ) );

        this.iMoveSpeed += app.Utils.limit( moveSpeed - this.iMoveSpeed, -0.25, 0.25 );
        return this.iMoveSpeed;
    };

    Animal.prototype.getChildren = function ()
    {
        if ( this.iChildren.length > 0 ) 
        {
            var children = this.iChildren;
            this.iChildren = [];
            return children;
        } 
        else {
            return [];
        }
    };

    Animal.prototype.canSearchForVictim = function ()
    {
        var allow = this.iVictimSearchSkippingStepsLeft === 0;
        if ( allow ) {
            this.iVictimSearchSkippingStepsLeft = this.iOptions.victimSearchSkippingSteps;
        } else {
            this.iVictimSearchSkippingStepsLeft -= 1;
        }
        return allow;
    };

    Animal.prototype.isLastNearestVictimStillClose = function ( aMaxDist )
    {
        if ( this.lastNearestVictim )
        {
            if ( this.lastNearestVictim.isEatable && !this.lastNearestVictim.isEatable() ) {    // if food is a plant
                return false;
            }
            else if ( this.lastNearestVictim.isDead && this.lastNearestVictim.isDead() ) {      // if food is an animal
                return false;
            }

            var dx = this.cell.col - this.lastNearestVictim.cell.col;
            var dy = this.cell.row - this.lastNearestVictim.cell.row;
            if ( Math.abs( dx ) <= aMaxDist && Math.abs( dy ) <= aMaxDist ) {
                return true;
            }
            else {
                if ( this.lastNearestVictim.removeChaser ) {
                    this.lastNearestVictim.removeChaser( this.ID );
                }
                this.lastNearestVictim = null;
            }
        }

        return false;
    };

    Animal.prototype.isHungry = function () {
        return this.getEnergy() < this.iOptions.energy.hungerThreshold;
    };

    Animal.prototype.isUnreachable = function ( aVictimID ) {
        return this.iUnreachableVictimIDs[ 'v' + aVictimID ];
    };

    Animal.prototype.isEating = function () {
        return !!this.iVictim;
    };

    Animal.prototype.kill = function ()
    {
        this.age = Animal.Age.DEAD;
        this.iCurrentStageAge = 0;
        this.iEnergy = 0;
    };

    Animal.prototype.isDead = function () {
        return this.age === Animal.Age.DEAD;
    };

    Animal.prototype.addChaser = function ( aID, aAngle, aCoords )
    {
        if ( !iOptions.chaserNotifyingDistance ) {
            return;
        }

        var id = 'c' + aID;
        if ( this.iChasers[ id ] ) {
            return;
        }

        var dx = aCoords.x - this.coords.x;
        var dy = aCoords.y - this.coords.y;
        if ( Math.sqrt( dx * dx + dy * dy) > this.iGenes.set.sensorSize * iOptions.chaserNotifyingDistance ) {
            return;
        }

        this.iChasers[ id ] = aAngle;
        this.iChasersCount += 1;

        var count = 0;
        var sin = 0;
        var cos = 0;
        for ( var chaserID in this.iChasers )
        {
            var angle = this.iChasers[ chaserID ];
            sin += Math.sin( angle );
            cos += Math.sin( angle );
            count += 1;
        }
        this.lastMoveAngle = Math.atan( sin / count, cos / count );
    };

    Animal.prototype.removeChaser = function ( aID )
    {
        if ( !iOptions.chaserNotifyingDistance ) {
            return;
        }
        
        var id = 'c' + aID;
        if ( !this.iChasers[ id ] ) {
            return;
        }
        
        delete this.iChasers[ id ];
        this.iChasersCount -= 1;
    };

    Animal.prototype.isChased = function () {
        return this.iChasersCount;
    };

    // ------------------------------------------------
    // Public static
    // ------------------------------------------------
    Animal.Age = {
        BABY: 0,
        CHILD: 1,
        YOUTH: 2,
        MATURED: 3,
        DELIVERED: 4,
        SENIOUR: 5,
        OLD: 6,
        DEAD: 7
    };

    Animal.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    // ------------------------------------------------
    // Private
    // ------------------------------------------------
    function tryToDeliverChildren()
    {
        var count = 0;
        var genes = this.iGenes.set;
        var age = this.iCurrentStageAge / this.iStageDuration;
        var chance = age * age * age;
        if ( Math.random() < chance )
        {
            count = Math.round( genes.fertility * this.iOptions.maxChildren * ( Math.random() * 0.5 + 0.5 ) );
            for ( var i = 0; i < count; ++i ) 
            {
                var child = new this.constructor( this.iGenes.mutate(), app.Utils.clone( this.cell ) );
                child.isInfected = this.isInfected;
                child.coords = app.Utils.clone( this.coords );
                this.iChildren.push( child );
            }
        }
        return count;
    }

    function calcEnergyChange()
    {
        var genes = this.iGenes.set;
        var victim = this.iVictim;

        var result = -this.iOptions.energy.decreasePerStep * 
            ( 1 + this.iMoveSpeed ) / 2 * 
            ( 1 + genes.size ) / 2 *
            ( 4 + genes.sensorSize ) / 5;

        if ( victim )
        {
            var eatedEnergy = Math.min( victim.energy,
                0.075 * 
                ( 1 + genes.size ) / 2 );
            victim.looseEnergy( eatedEnergy );
            result += eatedEnergy / this.iOptions.energy.foodRate;
        }

        if ( this.isInfected ) {
            result -= iOptions.energy.infectionDecrease;
        }

if (isNaN(result)) {
    console.log(victim);
    console.log(this.iMoveSpeed);
    console.log(this.iOptions.energy.decreasePerStep);
    console.log(genes.size);
    console.log(genes.sensorSize);
    console.log(iOptions.energy.infectionDecrease);
    console.log(this.iOptions.energy.foodRate);
}
        return result;
    }

    // static
    var sID = 0;

    // module export
    app.Animal = Animal;

})( MEW );

/*! Clock to count game duration
 *
 *  Singleton
 *  Usage: new MEW.Clock()
 *
 *  Required DOM/CSS:
 *      #clock
 */

(function (app) {
    'use strict';

    function Clock() { }

    var iContainer;
    var iEnabled = true;
    var iPrevDuration = 0;
    var iStart;

    function update()
    {
        var duration = Math.round( ( iPrevDuration + (Date.now() - iStart) ) / 1000 );
        var secs = (duration % 60) + '';
        while (secs.length < 2) secs = '0' + secs;
        duration = Math.floor( duration / 60 );
        var mins = (duration % 60) + '';
        while (mins.length < 2) mins = '0' + mins;
        duration = Math.floor( duration / 60 );
        var hours = (duration % 24) + '';
        while (hours.length < 2) hours = '0' + hours;

        iContainer.textContent = hours + ' : ' + mins + ' : ' + secs;

        if ( iEnabled ) {
            setTimeout( update, 500 );
        }
    }

    Clock.prototype.start = function()
    {
        iContainer = document.querySelector( '#clock' );
        if (!iContainer) {
            throw new Error( '#clock does not exist' );
        }
        this.resume();
    };
        
    Clock.prototype.resume = function ( aResumeModeName )
    {
        if ( aResumeModeName === 'Restart' ) {
            iPrevDuration = 0;
        }
        
        iEnabled = true;
        iStart = Date.now();
        setTimeout( update, 500 );
    };
    
    Clock.prototype.stop = function ()
    {
        iPrevDuration = Date.now() - iStart;
        iStart = Date.now();
        iEnabled = false;
    };
    
    app.Clock = Clock;

})( MEW );

/*! Color mixing routine
 *
 *  Based on:
 *    Color_mixer for substractive color mixing
 *    Author: Andy Soiron
 *    http://www.andysoiron.de
 * 
 *  Singleton
 *  Usage: MEW.Colors.<method>
 */

if (!MEW) {
    throw 'MEW is not initialized';
}

(function (app) {
    'use strict';

    var Colors = { };

    // aColors is an array of {color: #XXX or #XXXXXX, weight: real}
    Colors.mix = function( aColors )
    {
        var c = 0;
        var m = 0;
        var y = 0;
        var k = 0;
        var w = 0;
        for ( var i = 0; i < aColors.length; i += 1 )
        {
            var color = RGBAtoCMYK( aColors[ i ].color );
            var weight = aColors[ i ].weight;
            c += color.c * weight;
            m += color.m * weight;
            y += color.y * weight;
            k += color.k * weight;
            w += weight;
        }
        var cmyk = {
            c: c / w,
            m: m / w,
            y: y / w,
            k: k / w
        };
        var result = CMYKtoRGBA( cmyk );
        return result;
    };

    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------
    
    function RGBAtoCMYK( aColor )
    {
        aColor = aColor.substr( 1 );

        var compLength = aColor.length === 3 ? 1 : 2;
        var r = parseInt( aColor.substr( 0 * compLength, compLength ), 16 );
        var g = parseInt( aColor.substr( 1 * compLength, compLength ), 16 );
        var b = parseInt( aColor.substr( 2 * compLength, compLength ), 16 );
        var c = 255 - r;
        var m = 255 - g;
        var y = 255 - b;
        var k = Math.min( c, m, y );
        c = ((c - k) / (255 - k));
        m = ((m - k) / (255 - k));
        y = ((y - k) / (255 - k));

        return {
            c: c,
            m: m,
            y: y,
            k: k / 255
        };
    }

    function CMYKtoRGBA( aColor )
    {
        var r = aColor.c * (1.0 - aColor.k) + aColor.k;
        var g = aColor.m * (1.0 - aColor.k) + aColor.k;
        var b = aColor.y * (1.0 - aColor.k) + aColor.k;
        r = Math.round( (1.0 - r) * 255.0 + 0.5 );
        g = Math.round( (1.0 - g) * 255.0 + 0.5 );
        b = Math.round( (1.0 - b) * 255.0 + 0.5 );
        return '#' + decToHex( r ) + decToHex( g ) + decToHex( b );
    }

    function decToHex( aNum, aPadding )
    {
        var hex = Number( aNum ).toString( 16 );
        aPadding = !aPadding && aPadding !== 0 ? 2 : aPadding;

        while (hex.length < aPadding) {
            hex = '0' + hex;
        }

        return hex;
    }

    app.Colors = Colors;

})( MEW );

/*! Mixin to import event subscription and triggering
 *
 *  Usage: MEW.EventSource.call( object, [ <event1>, ... ] )
 */

(function (app) {
	'use strict';

    // aEvents is an array of strings (event names)
	function EventSource( aEvents )
	{
        // aName is event name
        // aCallback is a function to be called on event
        this.on = addCallback;
        
        // aName is event name
        // aCallback is a function to be removed from the list of callbacks
        this.off = removeCallback;
        
        // aName is event name
        // aArgs is an object with passes arguments
        this.trigger = fire;
        
        // ------------------------------------------------
        // internal
        // ------------------------------------------------
        
		this._events = {};
		for ( var i = 0; i < aEvents.length; i += 1 ) {
			this._events[ aEvents[ i ] ] = [];
		}

		function addCallback( aName, aCallback )
		{
			var evt = this._events[ aName ];
			if ( evt !== undefined ) {
				evt.push( aCallback );
			}
		};

		function removeCallback( aName, aCallback )
		{
			var evt = this._events[ aName ];
			if ( evt !== undefined ) {
				for ( var i = 0; i < evt.length; i += 1 ) {
      				if ( evt[ i ] === aCallback ) {
      					evt.splice( i, 1 );
      					break;
      				}
    			}
			}
		};

		function fire( aName, aArgs )
		{
			var evt = this._events[ aName ];
			if ( evt ) {
				for ( var i = 0; i < evt.length; i += 1 ) {
					evt[ i ].call( this, aArgs );
				}
			}
		};
	}

    app.EventSource = EventSource;

})( MEW );

/*! Main view (canvas)
 *
 *  Singleton
 *  Usage: new MEW.FieldView(...)
 * 
 *  Required DOM/CSS:
 *      #fieldView
 */

(function (app) {
    'use strict';

    var iOptions = {
        cellSize: 8,        // pixels
        smoothBanks: true,
        colors: {
            soilPoor: '#AB9465', //'#F2BA4F',
            soilRich: '#32312E',
            water: '#0080D8', //'rgba(0, 128, 216, 1)' //'#0080D8'
            wind: {
                arrow: '#FF8040',
                circle: {
                    border: '#383430',
                    fill: '#00D880',
                    alpha: 0.4
                },
                text: {
                    fill: '#FF8040',
                    stroke: '#000000'
                }
            },
            highLoadIndicator: {
                stroke: '#000000',
                fill: '#E00000'
            },
            minimap: {
                background: '#FFCCCC',
                frame: '#444444',
                visibleField: '#444488'
            }
        },
        wind: {
            strengthScale: 50,
            arrowPoint: {
                x: 70,
                y: 70
            }
        },
        updateInterval: 40
    };

    function FieldView( aWorld, aOptions )
    {
        this.created = false;

        app.Utils.extend( true, iOptions, aOptions );

        iWorld = aWorld;
        iWorld.addEventHandler( 'cellUpdate', drawSoilCell );
        iWorld.setCellSize( iOptions.cellSize );
        
        iWidth = iWorld.getWidth() * iOptions.cellSize;
        iHeight = iWorld.getHeight() * iOptions.cellSize;

        loadSprites( iPlantSprites );
        loadSprites( iSeedSprites );
        loadSprites( iVegeterianSprites );
        loadSprites( iPredatorSprites );
        
        iMsecPerFrame = new app.ProcessDuration();

        //document.addEventListener( 'DOMContentLoaded', this.create.bind(this) );
        window.addEventListener( 'resize', this.UpdateCanvasSize.bind(this) );
    }

    FieldView.prototype.create = function () 
    {
        if ( this.created ) {
            return;
        }

        this.created = true;

        iCanvas = document.querySelector( '#fieldView' );
        if (!iCanvas) {
            throw new Error( '#fieldView does not exist' );
        }

        iGraphics = iCanvas.getContext('2d');

        this.UpdateCanvasSize();

        iMinimap = new app.Minimap( iCanvas, { width: iWidth, height: iHeight } );

// var startTime = Date.now();
        createSoil();
        if ( iOptions.smoothBanks ) {
            smoothBanks();
        }
// alert( 'Soil drawn in ' + ( Date.now() - startTime ) + ' ms' );
        createWind();

        setTimeout( drawWorld, iOptions.updateInterval );
   };

    FieldView.prototype.UpdateCanvasSize = function ( e )
    {
        if ( iCanvas )
        {
            iCanvas.width = Math.max( document.documentElement.clientWidth, window.innerWidth || 0 );
            iCanvas.height = Math.max( document.documentElement.clientHeight, window.innerHeight || 0 );
        }
        if ( iMinimap )
        {
            iMinimap.updateCanvasSize( iCanvas );
        }
        iReestimateVisibility = true;
    };

    FieldView.prototype.getStatisticsTab = function ( aTab )
    {
        switch ( aTab )
        {
        case app.Statistics.Tabs.Count:
            return {
            };
        case app.Statistics.Tabs.Genes:
            return {
            };
        case app.Statistics.Tabs.Performance:
            return {
                msPerFrame: iMsecPerFrame.avg
            };
        default:
            throw new Error( 'Wrong tab ID' );
        }
    };

    FieldView.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    FieldView.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------

    var iWorld;
    var iCanvas;
    var iGraphics;
    var iMinimap;
    var iSoil;
    var iSoilGraphics;
    var iWind;
    
    var iWidth;
    var iHeight;
    var iViewportOffset = { x: -1, y: -1 };

    var iPlantSprites = [ 'plant', 8 ];
    var iSeedSprites = [ 'seed', 1 ];
    var iVegeterianSprites = [ 'vegeterian', 7 ];
    var iPredatorSprites = [ 'predator', 7 ];

    var iReestimateVisibility = true;
    var iMsecPerFrame;

    // Sprites
    function loadSprites( aSprites ) 
    {
        var baseName = aSprites[ 0 ];
        var count = aSprites[ 1 ];
        for ( var i = 0; i < count; ++i ) 
        {
            var imageObj = new Image();
            imageObj.src = 'sprites/' + baseName + '-' + i + '.png';
            aSprites[ i ] = imageObj;
        }
    }

    // Drawing
    function drawWorld()
    {
        var timestamp = Date.now();
        
        // draw soil
        var width = Math.min( iCanvas.width, iWidth - 1 );
        var height = Math.min( iCanvas.height, iHeight - 1 );

        var viewportOffset = iMinimap.getOffset();
        iReestimateVisibility = iReestimateVisibility || viewportOffset.x !== iViewportOffset.x || viewportOffset.y !== iViewportOffset.y;
        iViewportOffset = viewportOffset;

        if (iCanvas.width > iWidth || iCanvas.height > iHeight) {
            iGraphics.clearRect( 0, 0, iCanvas.width, iCanvas.height );
        }
        iGraphics.drawImage( iSoil, iViewportOffset.x, iViewportOffset.y, width, height, 0, 0, width, height );

        // draw life
        var count = 0;
        count += drawPlants();
        count += drawSeeds();
        count += drawVegeterians();
        count += drawPredators();
        
        // draw widgets
        drawMinimap();
        drawWind();
        drawHighLoadIndicator();
        
        if ( count )
        {
            var duration = Date.now() - timestamp;
            iMsecPerFrame.add( duration );
            var interval = Math.max( iOptions.updateInterval - duration, 0 );
            setTimeout( drawWorld, interval );
        }

        iReestimateVisibility = false;
    }

    // life
    function drawPlants()
    {
        var plants = iWorld.getPlants();
        var cellSize = iOptions.cellSize;
        for ( var plantIndex = 0; plantIndex < plants.length; ++plantIndex )
        {
            var plant = plants[ plantIndex ];
            if ( !iReestimateVisibility && !plant.isVisble) {
                continue;
            }

            var cell = plant.cell;
            var x = ( cell.col + 0.5 ) * cellSize - iViewportOffset.x;
            var y = ( cell.row + 0.5 ) * cellSize - iViewportOffset.y;
            plant.isVisble = !( x < 0 || y < 0 || x > iCanvas.width || y > iCanvas.height );
            if ( !plant.isVisble ) {
                continue;
            }

            var image = iPlantSprites[ plant.age ];
            if ( image ) {
                iGraphics.drawImage( image, x - image.width / 2, y - image.height );
            }
        }
        return plants.length;
    }

    function drawSeeds() {
        return drawMovableObjects( iWorld.getSeeds(), iSeedSprites );
    }

    function drawVegeterians() {
        return drawMovableObjects( iWorld.getVegeterians(), iVegeterianSprites );
    }

    function drawPredators() {
        return drawMovableObjects( iWorld.getPredators(), iPredatorSprites );
    }

    function drawMovableObjects( aObjects, aSprites )
    {
        for ( var i = 0; i < aObjects.length; i += 1 )
        {
            var obj = aObjects[ i ];
            if ( !iReestimateVisibility && !obj.isVisble) {
                continue;
            }

            var coords = obj.coords;
            var x = coords.x - iViewportOffset.x;
            var y = coords.y - iViewportOffset.y;
            obj.isVisible = !( x < 0 || y < 0 || x > iCanvas.width || y > iCanvas.height );
            if ( !obj.isVisible ) {
                continue;
            }

            var image = aSprites[ obj.age || 0 ];
            if ( image && image.complete )
            {
                iGraphics.drawImage( image, x - image.width / 2, y - image.height / 2 );
            }
            if ( obj.isInfected )
            {
                iGraphics.fillStyle = '#FF0000';
                iGraphics.fillRect( x + 10, y - 10, 3, 3);
            }
        }
        return aObjects.length;
    }

   // widgets
    function drawMinimap() 
    {
        if ( !iMinimap.isVisible() ) {
            return;
        }

        var minimapLocation = iMinimap.getLocation();
        var minimapSize = iMinimap.getSize();
        var minimapField = iMinimap.getField();

        iGraphics.drawImage( iMinimap.getCanvas(), minimapLocation.x, minimapLocation.y );

        iGraphics.strokeStyle = iOptions.colors.minimap.frame;
        iGraphics.lineWidth = 1;
        iGraphics.strokeRect( minimapLocation.x, minimapLocation.y, minimapSize.width, minimapSize.height );

        iGraphics.strokeStyle = iOptions.colors.minimap.visibleField;
        iGraphics.lineWidth = 2;
        iGraphics.strokeRect( minimapLocation.x + ( iViewportOffset.x / iWidth ) * minimapSize.width, 
                              minimapLocation.y + ( iViewportOffset.y / iHeight ) * minimapSize.height,
                              minimapField.width, minimapField.height );
    }

    function drawWind()
    {
        var wind = iWorld.getWind();
        var center = iOptions.wind.arrowPoint;
        var scale = iOptions.wind.strengthScale;

        iGraphics.drawImage( iWind, center.x - scale, center.y - scale );
        
        // arrow
        iGraphics.beginPath();
        iGraphics.moveTo( center.x, center.y );
        iGraphics.lineTo( center.x + scale * wind.strength * Math.cos( wind.direction ), 
                          center.y + scale * wind.strength * Math.sin( wind.direction ) );
        iGraphics.closePath();

        iGraphics.strokeStyle = iOptions.colors.wind.arrow;
        iGraphics.lineWidth = 5;
        iGraphics.stroke();
    }

    function drawHighLoadIndicator()
    {
        if ( !iWorld.isHighLoad() ) {
            return;
        }

        iGraphics.beginPath();
        iGraphics.arc( 10, 10, 7, 0, 2 * Math.PI );
        iGraphics.closePath();
        
        iGraphics.fillStyle = iOptions.colors.highLoadIndicator.fill;
        iGraphics.fill();
        
        iGraphics.lineWidth = 1;
        iGraphics.strokeStyle = iOptions.colors.highLoadIndicator.stroke;
        iGraphics.stroke();
    }

    // Drawing to buffers
    function getCellColor( aCell )
    {
        var color = iOptions.colors.water;
        if ( !aCell.isWater )
        {
            var waterWeight = 0.4 * aCell.moisture;
            color = app.Colors.mix( [ 
                { color: iOptions.colors.soilPoor, weight: ( 1 - waterWeight ) * ( 1 - aCell.richness ) },
                { color: iOptions.colors.soilRich, weight: ( 1 - waterWeight ) * aCell.richness },
                { color: iOptions.colors.water, weight: waterWeight / 2 }
            ] );
        }

        return color;
    }

    function createSoil()
    {
        iSoil = document.createElement( 'canvas' );
        iSoil.width = iWidth;
        iSoil.height = iHeight;
        iSoilGraphics = iSoil.getContext( '2d' );

        iSoilGraphics.clearRect( 0, 0, iWidth, iHeight );

        if ( iOptions.cellSize === 1 ) {
            drawSoilPixels();
        } else {
            drawSoilRects();
        }
    }

    function drawSoilPixels()
    {
        var img = iSoilGraphics.createImageData( iWidth, iHeight );

        var width = iWorld.getWidth();
        var height = iWorld.getHeight();

        for ( var row = 0; row < height; ++row)
        {
            for ( var col = 0; col < width; ++col)
            {
                var cell = iWorld.getSoilCell( col, row );
                var color = getCellColor( cell );
                
                var idx = ( col + row * width ) * 4;

                img.data[ idx ]     = parseInt( color.substr( 1, 2 ), 16 );
                img.data[ idx + 1 ] = parseInt( color.substr( 3, 2 ), 16 );
                img.data[ idx + 2 ] = parseInt( color.substr( 5, 2 ), 16 );

                img.data[ idx + 3 ] = 255;
            }
        }

        iSoilGraphics.putImageData( img, 0, 0 );
    }

    function drawSoilRects()
    {
        var width = iWorld.getWidth();
        var height = iWorld.getHeight();

        for ( var col = 0; col < width; ++col ) {
            for ( var row = 0; row < height; ++row ) {
                var isWater = drawSoilCell( col, row );
                iMinimap.addPixel( col / width, row / height, isWater );
            }
        }
        
        iMinimap.prepare(); // must be called after createSoil
    }

    function drawSoilCell( aCol, aRow )
    {
        var cell = iWorld.getSoilCell( aCol, aRow );
        var isWater = false;
        if ( !cell || !cell.moisture ) {
            iSoilGraphics.fillStyle = '#FF0000';
        }
        else
        {
            iSoilGraphics.fillStyle = getCellColor( cell );
            isWater = cell.isWater;
        }
        iSoilGraphics.fillRect( aCol * iOptions.cellSize, aRow * iOptions.cellSize, 
                                iOptions.cellSize + 1, iOptions.cellSize + 1 );
        return isWater;
    }
    
    function smoothCell ( aCell, aN1, aN2, aCol, aRow, aX1, aY1, aX2, aY2, aPrevSmooth, aNextSmooth )
    {
        var divPart = 3;
        var divFull = 2.1;
        var x = aCol * iOptions.cellSize;
        var y = aRow * iOptions.cellSize;
        var x1 = x + aX1 * iOptions.cellSize / ( aPrevSmooth ? divPart : divFull );
        var y1 = y + aY1 * iOptions.cellSize / ( aPrevSmooth ? divPart : divFull );
        var x2 = x + aX2 * iOptions.cellSize / ( aNextSmooth ? divPart : divFull );
        var y2 = y + aY2 * iOptions.cellSize / ( aNextSmooth ? divPart : divFull );
        
        var color1 = getCellColor( aN1 );
        var color2 = getCellColor( aN2 );
        var color = aCell.isWater ? app.Colors.mix( [ 
            { color: color1, weight: 1 },
            { color: color2, weight: 1 }
        ] ) : iOptions.colors.water;
        
        iSoilGraphics.fillStyle = color;
        iSoilGraphics.beginPath();
        iSoilGraphics.moveTo( x, y );
        iSoilGraphics.lineTo( x1, y1 );
        iSoilGraphics.lineTo( x2, y2 );
        iSoilGraphics.closePath();
        iSoilGraphics.fill();
    }

    function smoothBanks()
    {
        var width = iWorld.getWidth();
        var height = iWorld.getHeight();

        var isBankSide = function ( aCell, aN1, aN2 ) {
            if ( !aN1 || ! aN2) {
                return false;
            }
            return aCell.isWater !== aN1.isWater && aCell.isWater !== aN2.isWater;
        };

        for ( var col = 0; col < width; ++col ) {
            for ( var row = 0; row < height; ++row ) {
                var cell = iWorld.getSoilCell( col, row );
                var left = col > 0 ? iWorld.getSoilCell( col - 1, row ) : null;
                var right = col < width - 1 ? iWorld.getSoilCell( col + 1, row ) : null;
                var top = row > 0 ? iWorld.getSoilCell( col, row - 1 ) : null;
                var bottom = row < height - 1 ? iWorld.getSoilCell( col, row + 1 ) : null;
                var bankSides = {
                    topLeft: isBankSide( cell, left, top ),
                    topRight: isBankSide( cell, top, right ),   
                    bottomRight: isBankSide( cell, right, bottom ),
                    bottomLeft: isBankSide( cell, bottom, left )
                };
                
                if ( bankSides.topLeft && ( cell.isWater || iWorld.getSoilCell( col - 1, row - 1 ).isWater ) ) {
                    smoothCell( cell, left, top, col, row, 0, 1, 1, 0, bankSides.bottomLeft, bankSides.topRight );
                }
                if ( bankSides.topRight && ( cell.isWater || iWorld.getSoilCell( col + 1, row - 1 ).isWater ) ) {
                    smoothCell( cell, top, right, col + 1, row, -1, 0, 0, 1, bankSides.topLeft, bankSides.bottomRight );
                }
                if ( bankSides.bottomRight && ( cell.isWater || iWorld.getSoilCell( col + 1, row + 1 ).isWater ) ) {
                    smoothCell( cell, right, bottom, col + 1, row + 1, 0, -1, -1, 0, bankSides.topRight, bankSides.bottomLeft );
                }
                if ( bankSides.bottomLeft && ( cell.isWater || iWorld.getSoilCell( col - 1, row + 1 ).isWater ) ) {
                    smoothCell( cell, bottom, left, col, row + 1, 1, 0, 0, -1, bankSides.bottomRight, bankSides.topLeft );
                }
            }
        }
    }

    // Drawing wind to a buffer
    function createWind()
    {
        var windColors = iOptions.colors.wind;
        var scale = iOptions.wind.strengthScale;
        var center = { x: scale + 2, y: scale + 2 };

        iWind = document.createElement( 'canvas' );
        iWind.width = 2 * center.x;
        iWind.height = 2 * center.y + 0.1 * scale + 28;
        var windGraphics = iWind.getContext( '2d' );

        // circle
        windGraphics.beginPath();
        windGraphics.arc( center.x, center.y, scale, 0, 2 * Math.PI );
        windGraphics.closePath();
        
        windGraphics.fillStyle = windColors.circle.fill;
        windGraphics.globalAlpha = windColors.circle.alpha;
        windGraphics.fill();
        windGraphics.globalAlpha = 1;

        windGraphics.lineWidth = 5;
        windGraphics.strokeStyle = windColors.arrow;
        windGraphics.stroke();
        windGraphics.strokeStyle = windColors.circle.border;
        windGraphics.lineWidth = 1;
        windGraphics.stroke();

        // text
        var text = 'WIND';

        windGraphics.textAlign = 'center'; 
        windGraphics.font = 'bold 28px Oswald';
        windGraphics.textBaseline = 'top'; 

        windGraphics.lineWidth = 1;
        windGraphics.fillStyle = windColors.text.fill;
        windGraphics.fillText( text, center.x, center.y + 1.1 * scale);
        windGraphics.strokeStyle = windColors.text.stroke;
        windGraphics.strokeText( text, center.x, center.y + 1.1 * scale);
    }

    app.FieldView = FieldView;

})( MEW );

/*! All routines related to genes and evolution
 *
 *  Usage: <genes> = MEW.Genes.forXXXX()
 *         <newGenes> = new MEW.Genes( <genes> )
 */

(function (app) {
    'use strict';

    var iOptions = {
        mutation: {
            rate: 0.1,
            maxAmplitude: 0.2
        }
    };
    
    // aSet is object with one of collection returned by Genes.forXXXX()
    function Genes( aSet )
    {
        this.set = app.Utils.clone( aSet );
    }
        
    Genes.prototype.mutate = function()
    {
        if ( arguments.length === 1 ) {
            return mixWith( arguments[ 0 ] );
        } else {
            return clone( this.set );
        }
    };
        
    // ------------------------------------------------
    // Public static
    // ------------------------------------------------
    Genes.forPlant = function () {
        return new Genes( {
            height: app.Utils.randomInRange( 0.2, 1 ),
            seedSize: app.Utils.randomInRange( 0.2, 1 ),
            seedCount: app.Utils.randomInRange( 0.2, 1 ),
            flowerSize: app.Utils.randomInRange( 0.2, 1 )
        } );
    };

    Genes.forVegeterian = function () {
        return new Genes( {
            moveSpeed: app.Utils.randomInRange( 0.2, 1 ),
            size: app.Utils.randomInRange( 0.2, 1 ),
            sensorSize: app.Utils.randomInRange( 0.2, 1 ),
            fertility: app.Utils.randomInRange( 0.2, 1 )
        } );
    };

    Genes.forPredator = function () {
        return new Genes( {
            moveSpeed: app.Utils.randomInRange( 0.2, 1 ),
            size: app.Utils.randomInRange( 0.2, 1 ),
            sensorSize: app.Utils.randomInRange( 0.2, 1 ),
            fertility: app.Utils.randomInRange( 0.2, 1 )
        } );
    };

    Genes.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    Genes.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    // ------------------------------------------------
    // internal functions
    // ------------------------------------------------
    function mixWith( aGenes )
    {
        // TODO: implement genes mix 
        return new Genes( iSet );
    }
        
    function clone( aSet )
    {
        var newSet = {};
        for( var gene in aSet ) {
            if ( aSet.hasOwnProperty( gene ) ) {
                newSet[ gene ] = mutateGene( aSet[ gene ] );
            }
        }
        return new Genes( newSet );
    }
        
    function mutateGene( aGene )
    {
        var isComplex = typeof aGene === 'object';
        var value = isComplex ? aGene.value : aGene;
        var min = isComplex ? aGene.min : 0.05;
        var max = isComplex ? aGene.max : 1;
        if ( Math.random() < iOptions.mutation.rate )
        {
            var change = app.Utils.randomInRange( -iOptions.mutation.maxAmplitude,
                                                   iOptions.mutation.maxAmplitude );
            value = app.Utils.limit( value + change, min, max );
        }
        return isComplex ? { value: value, min: min, max: max } : value;
    }
    
    // module export
    app.Genes = Genes;

})( MEW );

/*! Indicator of high computation load
 *
 *  Singleton
 *  Usage: new MEW.HighLoadIndicator(...)
 */

(function (app) {
    'use strict';

    var iOptions = {
        alert: {
            lifetime: 2000,  //ms
            minCount: 5
        }
    };

    function HighLoadIndicator( aOptions )
    {
        this.isSet = function() {
            return notications.length >= iOptions.alert.minCount;
        };
        
        this.notify = function() {
            notications.push( Date.now() );
        };
        
        // ------------------------------------------------------
        // Private
        // ------------------------------------------------------
    
        app.Utils.extend( true, iOptions, aOptions );

        var timer = setInterval( checkStatus, 100 );
        var notications = [];

        function checkStatus()
        {
            var threshold = Date.now() - iOptions.alert.lifetime;
            for ( var i = notications.length - 1; i >= 0; --i)
            {
                if ( notications[ i ] < threshold ) {
                    notications.splice( 0, i + 1 );
                    break;
                }
            }
        }
    }
    
    HighLoadIndicator.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    HighLoadIndicator.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    app.HighLoadIndicator = HighLoadIndicator;

})( MEW );

/*! Message box (modal) <+ EventSource
 *
 *  Singleton
 *  Usage: MEW.Message.<method>
 *
 *  Required HTML/CSS:
 *      #message [ .hidden ]
 *          .central
 *              .text
 *              .buttons
 *                  [ .button ] [ :hover ]
 *
 * Events:
 *    show
 *    hide
 */

(function (app) {
    'use strict';

    var Message = { };

    app.EventSource.call( Message, [ 'show', 'hide' ] ) ;
    
    // aText is string to display
    // aButtons is an array of objects with 'title' as string, and 'callback as callback-on-click
    Message.show = function ( aText, aButtons )
    {
        var msgWindow = document.querySelector( '#message' );
        if ( !msgWindow ) {
            throw new Error( '#statistics does not exist' );
        }
        
        var msg = msgWindow.querySelector( '.text' );
        var buttonContainer = msgWindow.querySelector( '.buttons' );

        msg.innerHTML = aText;

        while ( buttonContainer.firstChild ) {
            buttonContainer.removeChild( buttonContainer.firstChild );
        }

        if ( aButtons )
        {
            var self = this;
            for ( var i = 0; i < aButtons.length; i += 1 )
            {
                var btnData = aButtons[ i ];
                var button = document.createElement( 'div' );
                button.textContent = btnData.title;
                button.classList.add( 'button' );
                button.addEventListener( 'click', btnData.callback );
                button.addEventListener( 'click', function () {
                    msgWindow.classList.add( 'hidden' );
                    self.trigger( 'hide', this.textContent );
                } );
                buttonContainer.appendChild( button );
            }
        }

        msgWindow.classList.remove( 'hidden' );

        this.trigger( 'show' );
    };

    app.Message = Message;

})( MEW );

/*! Navigation controller
 *
 *  Singleton
 *  Usage: new MEW.Minimap(...)
 */

(function (app) {
    'use strict';

	var iOptions = {
        shift: {
            margin: 30,
            dwellTime: 400,
            interval: 20,
            size: 8
        },
        maxSize: 100
	};

	function Minimap( aCanvas, aMapSize ) 
	{
		iCanvasSize = { width: aCanvas.width, height: aCanvas.height };
        iMapSize = aMapSize;

        aCanvas.addEventListener( 'mousemove', onCanvasMouseMove );
        aCanvas.addEventListener( 'mousedown', onCanvasMouseDown );
        aCanvas.addEventListener( 'mouseup', onCanvasMouseUp );
        aCanvas.addEventListener( 'mouseout', onCanvasMouseOut );
        aCanvas.addEventListener( 'click', onCanvasClick );
        document.addEventListener( 'keydown', onKeyDown );
        document.addEventListener( 'keyup', onKeyUp );

        var maxDimension = Math.max( iMapSize.width, iMapSize.height );
        var ratio = iOptions.maxSize / maxDimension;

        iSize.width = Math.round( iMapSize.width * ratio );
        iSize.height = Math.round( iMapSize.height * ratio );

        iCanvas = document.createElement( 'canvas' );
        iCanvas.width = iSize.width;
        iCanvas.height = iSize.height;
        iCanvasBuffer = new Array( iSize.width );
        for (var x = 0; x < iSize.width; ++x ) {
            iCanvasBuffer[ x ] = new Array( iSize.height );
            for (var y = 0; y < iSize.height; ++y ) {
                iCanvasBuffer[ x ][ y ] = 0;
            }
        }

        UpdateSizeParameters();
	}

	Minimap.prototype.isVisible = function () {
		return iIsVisible;
	};

	Minimap.prototype.getOffset = function () {
		return { x: iOffset.x, y: iOffset.y };
	};

    Minimap.prototype.getLocation = function () {
		return iLocation;
	};

    Minimap.prototype.getSize = function () {
		return iSize;
	};

    Minimap.prototype.getField = function () {
		return iField;
	};

    Minimap.prototype.updateCanvasSize = function ( aCanvas )
    {
        iCanvasSize = { width: aCanvas.width, height: aCanvas.height };
        UpdateSizeParameters();
    };

    Minimap.prototype.addPixel = function ( aX, aY, aIsWater )
    {
        var x = Math.floor( aX * iSize.width );
        var y = Math.floor( aY * iSize.height );
        iCanvasBuffer[ x ][ y ] += aIsWater ? -1 : 1;
    };

    Minimap.prototype.prepare = function ()
    {
        var graphics = iCanvas.getContext( '2d' );
        var img = graphics.createImageData( iSize.width, iSize.height );

        for (var x = 0; x < iSize.width; ++x ) 
        {
            for (var y = 0; y < iSize.height; ++y ) 
            {
                var isWater = iCanvasBuffer[ x ][ y ] < 0;
                var idx = ( x + y * iSize.width ) * 4;
                                       //    waerblue grey
                img.data[ idx ]     = isWater ? 0   : 128;
                img.data[ idx + 1 ] = isWater ? 128 : 128;
                img.data[ idx + 2 ] = isWater ? 255 : 128;
                img.data[ idx + 3 ] = 255;
            }
        }
        graphics.putImageData( img, 0, 0 );
    };

    Minimap.prototype.getCanvas = function () {
        return iCanvas;
    };

    // ------------------------------------------------
    // Static
    // ------------------------------------------------

    Minimap.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    Minimap.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    // ------------------------------------------------
    // Private
    // ------------------------------------------------

    var iCanvasSize;
    var iMapSize;
    var iCanvas;
    var iCanvasBuffer;
    var iCanvasGraphics;
    var iCanvasGraphicsData;

    var iLocation = { x: 0, y: 0 };
    var iSize = { width: 0, height: 0 };
    var iField = { width: 0, height: 0 };

    var iIsVisible = false;
    var iShiftTimer = null;
    var iShiftDirection = { x: 0, y: 0 };
    var iOffset = { x: 0, y: 0 };
    var iLastShiftAt = null;
    var iIsLeftButtonDown = false;

    function onCanvasMouseMove( aEvent )
    {
        var startTimer = false;
        var x = aEvent.clientX;
        var y = aEvent.clientY;
        
        if ( iIsVisible && !isPointOnMinimap( x, y ) )
        {
            if ( iCanvasSize.width < iMapSize.width )
            {
                if ( 0 <= x && x < iOptions.shift.margin ) {
                    iShiftDirection.x = -1;
                    startTimer = true;
                } else if ( iCanvasSize.width - iOptions.shift.margin <= x && x < iCanvasSize.width ) {
                    iShiftDirection.x = 1;
                    startTimer = true;
                } else {
                    iShiftDirection.x = 0;
                }
            }

            if ( iCanvasSize.height < iMapSize.height )
            {
                if ( 0 <= y && y < iOptions.shift.margin ) {
                    iShiftDirection.y = -1;
                    startTimer = true;
                } else if ( iCanvasSize.height - iOptions.shift.margin <= y && y < iCanvasSize.height ) {
                    iShiftDirection.y = 1;
                    startTimer = true;
                } else {
                    iShiftDirection.y = 0;
                }
            }
        }
        else if ( iIsLeftButtonDown ) {
        	calcOffset( x, y );
        }
        
        if ( startTimer && !iShiftTimer ) {
            iShiftTimer = setTimeout( doShift, iOptions.shift.dwellTime );
        } 
        else if ( !startTimer && iShiftTimer ) {
            clearTimeout( iShiftTimer );
            iShiftTimer = null;
            iLastShiftAt = null;
        }
    }

    function onCanvasMouseOut( aEvent ) 
    {
        if ( iShiftTimer )
        {
            clearTimeout( iShiftTimer );
            iShiftTimer = null;
            iLastShiftAt = null;
        }
    }

    function onCanvasClick( aEvent )
    {
        var x = aEvent.clientX;
        var y = aEvent.clientY;
        if ( iIsVisible && isPointOnMinimap( x, y ) ) {
        	calcOffset( x, y );
        }
    }

    function onCanvasMouseDown( aEvent )
    {
    	if ( iIsVisible && aEvent.button === 0 && isPointOnMinimap( aEvent.clientX, aEvent.clientY ) ) { // left
    		iIsLeftButtonDown = true;
        }
    }

    function onCanvasMouseUp( aEvent ) {
    	if ( aEvent.button === 0 ) { // left
    		iIsLeftButtonDown = false;
        }
    }

    function onKeyDown( aEvent )
    {
        iShiftDirection.x = 0;
        iShiftDirection.y = 0;
        var startTimer = true;

        if ( aEvent.keyCode === 37 ) {
            iShiftDirection.x = -1;
        } else if ( aEvent.keyCode === 39 ) {
            iShiftDirection.x = 1;
        } else if ( aEvent.keyCode === 38 ) {
            iShiftDirection.y = -1;
        } else if ( aEvent.keyCode === 40 ) {
            iShiftDirection.y = 1;
        } else {
            startTimer = false;
        }
        
        if ( startTimer && !iShiftTimer ) {
            iShiftTimer = setTimeout( doShift, iOptions.shift.interval );
        } 
        else if ( !startTimer && iShiftTimer ) {
            clearTimeout( iShiftTimer );
            iShiftTimer = null;
            iLastShiftAt = null;
        }
    }

    function onKeyUp( aEvent )
    {
        var stopTimer = aEvent.keyCode === 37 ||
                        aEvent.keyCode === 38 ||
                        aEvent.keyCode === 39 ||
                        aEvent.keyCode === 40;

        if ( stopTimer && iShiftTimer ) 
        {
            clearTimeout( iShiftTimer );
            iShiftTimer = null;
            iLastShiftAt = null;
        }
    }
    
    function isPointOnMinimap( aX, aY ) {
        return iLocation.x < aX && aX < iCanvasSize.width && iLocation.y < aY && aY < iCanvasSize.height;
    }

    function calcOffset( aX, aY )
    {
        var x = ( aX - iLocation.x - iField.width / 2) / iSize.width * iMapSize.width;
        var y = ( aY - iLocation.y - iField.height / 2) / iSize.height * iMapSize.height;
        iOffset.x = Math.min( Math.max( x, 0 ), Math.max( iMapSize.width - iCanvasSize.width, 0) );
        iOffset.y = Math.min( Math.max( y, 0 ), Math.max( iMapSize.height - iCanvasSize.height, 0) );
    }

    function doShift()
    {
        var k = iLastShiftAt ? ( Date.now() - iLastShiftAt ) / iOptions.shift.interval : 1;
        
        var x = iMapSize.width <= iCanvasSize.width ? iOffset.x :
                Math.min( Math.max( iOffset.x + iShiftDirection.x * iOptions.shift.size * k, 0 ), iMapSize.width - iCanvasSize.width );
        var y = iMapSize.height <= iCanvasSize.height ? iOffset.y :
                Math.min( Math.max( iOffset.y + iShiftDirection.y * iOptions.shift.size * k, 0 ), iMapSize.height - iCanvasSize.height );
        
        if ( iOffset.x !== x || iOffset.y !== y ) {
            iOffset.x = x;
            iOffset.y = y;
            iLastShiftAt = new Date();
            iShiftTimer = setTimeout( doShift, iOptions.shift.interval );
        } else {
            iShiftTimer = null;
            iLastShiftAt = null;
        }
    }

    function UpdateSizeParameters()
    {
        var maxDimension = Math.max( iMapSize.width, iMapSize.height );
        var ratio = iOptions.maxSize / maxDimension;

        iLocation.x = iCanvasSize.width - iSize.width;
        iLocation.y = iCanvasSize.height - iSize.height;
        iIsVisible = iMapSize.width > iCanvasSize.width || iMapSize.height > iCanvasSize.height;
        iField.width = Math.min( iCanvasSize.width * ratio, iSize.width );
        iField.height = Math.min( iCanvasSize.height * ratio, iSize.height );
    }

    // module export
    app.Minimap = Minimap;

})( MEW );

/*! Options box (modal) <+ EventSource
 *
 *  Singleton
 *  Usage: MEW.Options.<method>
 *
 *  Required HTML/CSS:
 *      #options [ .hidden ]
 *          .central
 *              .title
 *              .tabs
 *                  .list
 *                  .pages
 *              .buttons
 *                  [ .button ] [ :hover ]
 *
 * Events:
 *    show
 *    hide
 */

(function (app) {
    'use strict';

    var Options = { };

    app.EventSource.call( Options, [ 'show', 'hide' ] ) ;
    
    var iCurrentTab = null;
    var iSeparateWordsRE = /([a-z0-9_]+)([A-Z]{1}|$)/g;

    Options.show = function ()
    {
        var optionsSet = load();

        var optionsWindow = document.querySelector( '#options' );
        if ( !optionsWindow ) {
            throw new Error( '#statistics does not exist' );
        }

        var tabs = optionsWindow.querySelector( '.tabs' );
        
        createButtons.call(this, optionsWindow, tabs, optionsSet );

        // fill options
        for ( var i = 0; i < optionsSet.length; i += 1 )
        {
            var options = optionsSet[ i ];
            var page = createOptionsPage( tabs, options.owner.getOptions(), options.items );
            createOptionsListItem( tabs, options.name, options.icon, page );
            optionsSet[ i ].page = page;
        }

        optionsWindow.classList.remove( 'hidden' );

        this.trigger( 'show' );
    };

    function getOptionsSet()
    {
        return [
            {
                name: 'World',
                icon: 'world.png',
                owner: MEW.World,
                items: [
                    { path: 'size.width', title: 'Width, cells', description: 'Width in cells', min: 100, max: 1000, step: 5 },
                    { path: 'size.height', title: 'Height, cells', description: 'Height in cells', min: 100, max: 1000, step: 5 },
                    { path: 'plants.areaPerInitUnit', title: 'Area per unit/ c^2/u', description: 'Initial area per plant, square cells / plant', min: 10, max: 200, step: 5 },
                    { path: 'vegeterians.maxMoveSpeed', title: 'Move distance, px', description: 'Maximum distance a creature can move per tick', min: 3, max: 12, step: 1 },
                    { path: 'vegeterians.windMoveScale', title: 'Move by wind, px', description: 'Maximum distance to travel due to the wind', min: 0, max: 5, step: 0.1 },
                    { path: 'vegeterians.maxAngleChange', title: 'Angle change, rad', description: 'Maximum angle a creature can turn per stap', min: 0.1, max: 1, step: 0.05 },
                    { path: 'vegeterians.maxVisionDistance', title: 'Vision distance, px', description: 'Maximum distance a creature can notify food from', min: 5, max: 15, step: 1 },
                    { path: 'vegeterians.areaPerInitUnit', title: 'Area per unit', description: 'Initial are per creature, square cells / creature', min: 500, max: 2000, step: 20 },
                    { path: 'predators.maxMoveSpeed', title: 'Move distance, px', description: 'Maximum distance a creature can move per tick', min: 3, max: 12, step: 1 },
                    { path: 'predators.windMoveScale', title: 'Move by wind, px', description: 'Maximum distance to travel due to the wind', min: 0, max: 5, step: 0.1 },
                    { path: 'predators.maxAngleChange', title: 'Angle change, rad', description: 'Maximum angle a creature can turn per stap', min: 0.1, max: 1, step: 0.05 },
                    { path: 'predators.maxVisionDistance', title: 'Vision distance, px', description: 'Maximum distance a creature can notify food from', min: 10, max: 25, step: 1 },
                    { path: 'predators.areaPerInitUnit', title: 'Area per unit', description: 'Initial are per creature, square cells / creature', min: 2000, max: 10000, step: 200 },
                    { path: 'seeds.moveScale', title: 'Move per tick, cells', description: 'Maximum distance a seed can travel per tick', min: 0.5, max: 5, step: 0.5 },
                    { path: 'seeds.dropScale', title: 'Drop per tick, r.u.', description: 'Maximum height drop per tick, in relative units of the plant height (adjustable)', min: 0.1, max: 1, step: 0.1 },
                    { path: 'infection.vegeterians.enabled' },
                    { path: 'infection.vegeterians.appearanceRate', title: 'Rate', description: 'Chance to get infected', min: 0.00005, max: 0.0003, step: 0.00001 },
                    { path: 'infection.predators.enabled' },
                    { path: 'infection.predators.appearanceRate', title: 'Rate', description: 'Chance to get infected', min: 0.00005, max: 0.0003, step: 0.00001 },
                    { path: 'infection.predators.populationFactor', title: 'Population factor', description: 'Increase in infection rate caused by one creature', min: 0.01, max: 0.5, step: 0.01 },
                    { path: 'infection.deseaseRate', title: 'Virulence', description: 'Chance to transfer infection from one creature to another when they are on a same cell', min: 0, max: 1, step: 0.05 },
                    { path: 'infection.speedRate', title: 'Speed decrease', description: 'The factor to decrease speed for the inected creatures', min: 0.2, max: 0.8, step: 0.1 },
                    { path: 'agingInterval', title: 'Time per tick, ms', description: 'Desired time span to spend between ticks', min: 10, max: 100, step: 5 }
                ]
            }, {
                name: 'View',
                icon: 'view.png',
                owner: MEW.FieldView,
                items: [
                    { path: 'cellSize', title: 'Cell size, px', description: 'Cell size in pixels', min: 5, max: 20, step: 1 },
                    { path: 'smoothBanks', title: 'Draw smooth coasts' },
                    { path: 'colors.soilPoor', title: 'Poor soil' },
                    { path: 'colors.soilRich', title: 'Rich soil' },
                    { path: 'colors.water', title: 'Water' },
                    { path: 'colors.wind.arrow' },
                    { path: 'colors.wind.circle.border', title: 'Border' },
                    { path: 'colors.wind.circle.fill', title: 'Background' },
                    { path: 'colors.wind.circle.alpha', title: 'Opaqueness', min: 0.3, max: 1, step: 0.1 },
                    { path: 'colors.wind.text.fill', title: 'Background' },
                    { path: 'colors.wind.text.stroke', title: 'Border' },
                    { path: 'colors.highLoadIndicator.stroke', title: 'Border' },
                    { path: 'colors.highLoadIndicator.fill', title: 'Background' },
                    { path: 'colors.minimap.background' },
                    { path: 'colors.minimap.frame', title: 'Border' },
                    { path: 'colors.minimap.visibleField', title: 'Viewport border' },
                    { path: 'wind.strengthScale', title: 'Size, px', description: 'Size of the wind radar', min: 20, max: 70, step: 5 },
                    { path: 'wind.arrowPoint.x', title: 'X or radar center, px', description: 'Radar position, x coordinate', min: 20, max: 150, step: 5 },
                    { path: 'wind.arrowPoint.y', title: 'Y or radar center, px', description: 'Radar position, y coordinate', min: 20, max: 150, step: 5 },
                    { path: 'updateInterval', title: 'Time per frame, ms', description: 'Desired time span to spend between world redraws', min: 10, max: 50, step: 5 }
                ]
            }, {
                name: 'Terrain generator',
                icon: 'tergen.png',
                owner: MEW.TerrainGenerator,
                items: [
                    { path: 'grain', title: 'Grain, cells', description: 'Minimum size of terrain change', min: 5, max: 20, step: 1 },
                    { path: 'isFlat', title: 'Flat terrain', description: 'True if there should be large areas with flat terrain' }
                ]
            }, {
                name: 'Genes',
                icon: 'genes.png',
                owner: MEW.Genes,
                items: [
                    { path: 'mutation.rate', title: 'Mutation rate', description: 'Chance for mutation event', min: 0.05, max: 0.5, step: 0.01 },
                    { path: 'mutation.maxAmplitude', title: 'Amplitude', description: 'Maximum relative change of a gene per mutation', min: 0.05, max: 0.5, step: 0.05 }
                ]
            }, {
                name: 'Plants',
                icon: 'plants.png',
                owner: MEW.Plant,
                items: [
                    { path: 'stageDuration', title: 'Stage duration, ticks', description: 'Duration of each stage of the plant life', min: 100, max: 1000, step: 50 },
                    { path: 'height', title: 'Height, r.u.', description: 'Maximum plant height in relative units', min: 10, max: 100, step: 5 },
                    { path: 'seedCount', title: 'Seed count', description: 'Maximum number of seed a plant can deliver', min: 1, max: 8, step: 1 },
                    { path: 'energy.increasePerStep', title: 'Increase per tick', description: 'Increase of energy per tick', min: 0.001, max: 0.010, step: 0.001 },
                    { path: 'energy.decreasePerDensity', title: 'Decrease due cohabitance', description: 'Decrease of energy per tick due cohabitance', min: 0.001, max: 0.020, step: 0.001 }
                ]
            }, {
                name: 'Vegetarians',
                icon: 'vegetarians.png',
                owner: MEW.Vegeterian,
                items: [
                    { path: 'stageDuration.minimum', title: 'Minimum, ticks', description: 'Minimum creatures` life stage duration in ticks', min: 100, max: 2000, step: 20 },
                    { path: 'stageDuration.maximum', title: 'Maximum, ticks', description: 'Maximum creatures` life stage duration in ticks', min: 100, max: 2000, step: 20 },
                    { path: 'maxDeliveryCount', title: 'Delivery count', description: 'Maximum number of deliveries', min: 1, max: 6, step: 1 },
                    { path: 'maxChildren', title: 'Fertility', description: 'Maximum number of children', min: 2, max: 10, step: 1 },
                    { path: 'energy.minToDeliver', title: 'Minimal for delivering', description: 'Minimum energy required to be able to deliver', min: 0.05, max: 0.8, step: 0.05 },
                    { path: 'energy.decreasePerStep', title: 'Decrease per tick', description: 'Energy decrease per stap', min: 0.0005, max: 0.01, step: 0.0005 },
                    { path: 'energy.infectionDecrease', title: 'Infected decrease per tick', description: 'Additional energy decrease for infected creatures per stap', min: 0.0005, max: 0.01, step: 0.0005 },
                    { path: 'energy.aliveThreshold', title: 'Health threshold', description: 'The threshold to stay `alive`: a creature dies quickly if energy drops below it', min: 0.05, max: 0.2, step: 0.05 },
                    { path: 'energy.hungerThreshold', title: 'Hunger threshold', description: 'When the energy drops below this threshold, the creature start searching for food', min: 0.5, max: 0.9, step: 0.05 },
                    { path: 'energy.foodRate', title: 'Food rate', description: 'The fraction of the food`s (victim`s) energy to be added to the creature`s energy', min: 1, max: 10, step: 0.5 },
                    { path: 'relaxedSpeed', title: 'Relaxed speed', description: 'Fraction of the normal speed for not hungry creatures', min: 0.1, max: 0.9, step: 0.05 },
                    { path: 'chaserNotifyingDistance', title: 'Chaser notifying distance, px', description: 'The distance creatures notify they are being chased', min: 0, max: 100, step: 5 }
                ]
            }, {
                name: 'Predators',
                icon: 'predators.png',
                owner: MEW.Predator,
                items: [
                    { path: 'stageDuration.minimum', title: 'Minimum, ticks', description: 'Minimum creatures` life stage duration in ticks', min: 100, max: 2000, step: 20 },
                    { path: 'stageDuration.maximum', title: 'Maximum, ticks', description: 'Maximum creatures` life stage duration in ticks', min: 100, max: 2000, step: 20 },
                    { path: 'maxDeliveryCount', title: 'Delivery count', description: 'Maximum number of deliveries', min: 1, max: 6, step: 1 },
                    { path: 'maxChildren', title: 'Fertility', description: 'Maximum number of children', min: 2, max: 10, step: 1 },
                    { path: 'energy.minToDeliver', title: 'Minimal for delivering', description: 'Minimum energy required to be able to deliver', min: 0.05, max: 0.8, step: 0.05 },
                    { path: 'energy.decreasePerStep', title: 'Decrease per tick', description: 'Energy decrease per stap', min: 0.0005, max: 0.01, step: 0.0005 },
                    { path: 'energy.infectionDecrease', title: 'Infected decrease per tick', description: 'Additional energy decrease for infected creatures per stap', min: 0.0005, max: 0.01, step: 0.0005 },
                    { path: 'energy.aliveThreshold', title: 'Health threshold', description: 'The threshold to stay `alive`: a creature dies quickly if energy drops below it', min: 0.05, max: 0.2, step: 0.05 },
                    { path: 'energy.hungerThreshold', title: 'Hunger threshold', description: 'When the energy drops below this threshold, the creature start searching for food', min: 0.5, max: 0.9, step: 0.05 },
                    { path: 'energy.foodRate', title: 'Food rate', description: 'The fraction of the food`s (victim`s) energy to be added to the creature`s energy', min: 1, max: 10, step: 0.5 },
                    { path: 'relaxedSpeed', title: 'Relaxed speed', description: 'Fraction of the normal speed for not hungry creatures', min: 0.1, max: 0.9, step: 0.05 },
                    { path: 'chasingScale', title: 'Chaser speed factor', description: 'The factor the chaser speed increases', min: 1, max: 1.5, step: 0.05 }
                ]
            }, {
                name: 'Mini-map',
                icon: 'minimap.png',
                owner: MEW.Minimap,
                items: [
                    { path: 'shift.margin', title: 'Sensible border size, px', description: 'The size of border around the viewport sensible to mouse: the viewport shift when the mouse hovers this border', min: 10, max: 50, step: 5 },
                    { path: 'shift.dwellTime', title: 'Latency, ms', description: 'Latency in shift start after the mouse enters the sensible border', min: 100, max: 1000, step: 50 },
                    { path: 'shift.interval', title: 'Interval, ms', description: 'Interval between steps of the shift', min: 10, max: 50, step: 5 },
                    { path: 'shift.size', title: 'Step size, px', description: 'Size of a single shift step', min: 2, max: 20, step: 2 },
                    { path: 'maxSize', title: 'Size, px', description: 'Maximum minimap size', min: 60, max: 240, step: 10 }
                ]
            }, {
                name: 'Wind',
                icon: 'wind.png',
                owner: MEW.Wind,
                items: [
                    { path: 'updateInterval', title: 'Update interval, ms', description: 'Interval between sinw direction updates', min: 500, max: 5000, step: 100 }
                ]
            }, {
                name: 'HiLoad Indicator',
                icon: 'hiloadind.png',
                owner: MEW.HighLoadIndicator,
                items: [
                    { path: 'alert.lifetime', title: 'Life-time, ms', description: 'Time interval to memorize high-load alert', min: 500, max: 5000, step: 100 },
                    { path: 'alert.minCount', title: 'Minimum count', description: 'Minimum count of memorized alert to show the indicator', min: 2, max: 20, step: 1 }
                ]
            }
        ];
    }

    function createButtons( aWindow, aTabs, aOptionsSet )
    {
        var onSumbit = function () {
            saveOptions( aOptionsSet );

            aTabs.classList.add( 'hidden' );
            buttonContainer.classList.add( 'hidden' );
            var title = aWindow.querySelector( '.title' );
            title.textContent = "Loading...";

            setTimeout(function () {
                self.trigger( 'hide' );
                aWindow.classList.add( 'hidden' );
            }, 100);

            return false;
        };

        var buttonContainer = aWindow.querySelector( '.buttons' );
        while ( buttonContainer.firstChild ) {
            buttonContainer.removeChild( buttonContainer.firstChild );
        }

        var resetButton = createButton( 'Reset', function () {
            resetOptions( aOptionsSet );
        });
        buttonContainer.appendChild( resetButton );

        var self = this;
        var startButton = createButton( 'Start', onSumbit, true );
        buttonContainer.appendChild( startButton );

        var form = aWindow.querySelector( 'form' );
        form.onsubmit = onSumbit;
    }

    function createButton( aName, aCallback, aIsSumbit )
    {
        var button = document.createElement( aIsSumbit ? 'input' : 'div' );
        if ( aIsSumbit )
        {
            button.type = 'submit';
            button.value = aName;
        }
        else
        {
            button.textContent = aName;
            button.addEventListener( 'click', aCallback );
        }
        button.classList.add( 'button' );
        return button;
    }

    function createTooltip( aParent )
    {
        var tooltip = document.createElement( 'div' );
        tooltip.classList.add( 'tooltip' );
        tooltip.classList.add( 'invisible' );
        aParent.appendChild( tooltip );
    }

    // loading
    function load()
    {
        var optionsSet = getOptionsSet();
        for ( var i = 0; i < optionsSet.length; i += 1 )
        {
            var options = optionsSet[ i ];
            var storedOptionsString = localStorage.getItem( options.name );
            if ( storedOptionsString ) 
            {
                var storedOptions = JSON.parse( storedOptionsString );
                var defaultOptions = options.owner.getOptions();
                app.Utils.extend( true, defaultOptions, storedOptions);
                options.owner.setOptions( defaultOptions );
            }
        }

        return optionsSet;
    }

    function createOptionsListItem( aTabs, aName, aIcon, aPage )
    {
        var list = aTabs.querySelector( '.list' );

        var listItem = document.createElement( 'div' );
        listItem.classList.add( 'item' );
        if ( list.childNodes.length === 0 ) {
            listItem.classList.add( 'selected' );
            iCurrentTab = { header: listItem, page: aPage };
        }
        listItem.addEventListener( 'click', function () {
            iCurrentTab.header.classList.remove( 'selected' );
            iCurrentTab.page.classList.add( 'hidden' );
            this.classList.add( 'selected' );
            aPage.classList.remove( 'hidden' );
            
            iCurrentTab = { header: this, page: aPage };
        } );

        var listItemIcon = document.createElement( 'img' );
        listItemIcon.src = 'images/options/' + aIcon;
        listItem.appendChild( listItemIcon );


        var listItemText = document.createElement( 'div' );
        listItemText.textContent = aName;
        listItem.appendChild( listItemText );

        list.appendChild( listItem );
    }

    function createOptionsPage( aTabs, aItems, aItemsToDisplay )
    {
        var pages = aTabs.querySelector( '.pages' );

        var page = document.createElement( 'div' );
        page.classList.add( 'page' );

        if ( aItemsToDisplay ) {
            var stack = [];
            for ( var i = 0; i < aItemsToDisplay.length; i += 1 ) {
                stack = createOption2( page, aItems, aItemsToDisplay[ i ], stack );
            }
        } else {
            for ( var name in aItems ) {
                createOption( page, 0, name, aItems[ name ] );
            }
        }

        if ( pages.childNodes.length > 0 ) {
            page.classList.add( 'hidden' );
        }

        createTooltip( page );

        pages.appendChild( page );
        return page;
    }

    function createOption( aParent, aLevel, aName, aValue )
    {
        var option = document.createElement( 'div' );
        option.classList.add( 'option' );
        option.__level__ = aLevel;

        var text = aName.replace( iSeparateWordsRE, '$1 $2' ).toLowerCase();
        text = text[ 0 ].toUpperCase() + text.substring( 1 );
        
        var name = document.createElement( 'div' );
        name.classList.add( 'name' );
        name.style.paddingLeft = aLevel + 'em';
        name.textContent = text;
        option.appendChild( name );

        if ( typeof aValue === 'object' )
        {
            aParent.appendChild( option );
            for ( var key in aValue ) {
                createOption( aParent, aLevel + 1, key, aValue[ key ] );
            }
        }
        else
        {
            var control = createOptionControl( aValue );
            if ( control )
            {
                option.appendChild( control );
                aParent.appendChild( option );
            }
        }
    }
    
    function createOption2( aPage, aItems, aItem, aStack )
    {
        var path = aItem.path.split( '.' );
        var i;

        var value = aItems;
        for ( i = 0; i < path.length; i += 1 )
        {
            value = value[ path[ i ] ];
            if ( value === undefined ) {
                throw new Error( 'Options has unreferenced item: ' + aItem.path );
            }
        }

        var control = createOptionControl( value, aItem.min, aItem.max, aItem.step, aItem.description );
        if ( !control ) {
            return aStack;
        }

        for ( i = 0; i < path.length && i < aStack.length; i += 1 ) {
            if ( path[ i ] != aStack[ i ] ) {
                break;
            }
        }

        aStack.length = i;
        for ( ; i < path.length; i += 1 )
        {
            var option = document.createElement( 'div' );
            option.classList.add( 'option' );
            option.__level__ = i;

            var title;
            if ( i === path.length - 1 && aItem.title )
            {
                title = aItem.title;
                option.__propName__ = path[ i ];
            }
            else
            {
                title = path[ i ].replace( iSeparateWordsRE, '$1 $2' ).toLowerCase();
                title = title[ 0 ].toUpperCase() + title.substring( 1 );
            }

            var name = document.createElement( 'div' );
            name.classList.add( 'name' );
            name.style.paddingLeft = i + 'em';
            name.textContent = title;
            option.appendChild( name );

            if ( i === path.length - 1 ) {
                option.appendChild( control );
            }

            aPage.appendChild( option );
            aStack.push( path[ i ] );
        }

        return aStack;
    }

    function createOptionControl( aValue, aMin, aMax, aStep, aDescription )
    {
        var container = document.createElement( 'div' );
        container.classList.add( 'value' );
        
        var control = document.createElement( 'input' );
        if ( typeof aValue === 'number' )
        {
            control.type = 'number';
            control.value = aValue;
            if ( aMin !== undefined ) {
                control.min = aMin;
            }
            if ( aMax !== undefined ) {
                control.max = aMax;
            }
            if ( aStep !== undefined ) {
                control.step = aStep;
            }
        }
        else if ( typeof aValue === 'string' )
        {
            control.type = aValue[0] === '#' ? 'color' : 'text';
            control.value = aValue;
        }
        else if ( typeof aValue === 'boolean' )
        {
            control.type = 'checkbox';
            control.checked = aValue;
            control.id = 'chk' + Math.round( Math.random() * 1000000000 );

            var label = document.createElement( 'label' );
            label.htmlFor = control.id;

            var span = document.createElement( 'span' );
            label.appendChild( span );

            // next, append the hidden checkbox and set the object to be appended to 'label'
            container.appendChild( control );
            control = label;
        }
        else {
            control = null;
        }

        if ( control )
        {
            if ( aDescription )
            {
                control.addEventListener( 'mouseover' , function () {
                    var tooltip = container.parentNode.parentNode.querySelector( '.tooltip' );
                    tooltip.textContent = aDescription;
                    if ( control.offsetTop > 50 )
                        tooltip.style.top = control.offsetTop - tooltip.offsetHeight - 12 + 'px';
                    else
                        tooltip.style.top = control.offsetTop + control.offsetHeight + 12 + 'px';
                    tooltip.style.right = '8px';
                    tooltip.classList.remove( 'invisible' );
                });
                control.addEventListener( 'mouseleave' , function () {
                    var tooltip = container.parentNode.parentNode.querySelector( '.tooltip' );
                    tooltip.classList.add( 'invisible' );
                });
            }
            container.appendChild( control );
        }
        else {
            container = null;
        }
        
        return container;
    }

    // saving
    function saveOptions( aOptionsSet )
    {
        for ( var i = 0; i < aOptionsSet.length; i += 1 )
        {
            var options = aOptionsSet[ i ];
            var newOptions = getNewOptions( options.page );
            options.owner.setOptions( newOptions );
            localStorage.setItem( options.name, JSON.stringify( newOptions ) );
        }
    }

    function getNewOptions( aPage )
    {
        var entries = aPage.querySelectorAll( '.option' );

        var newOptions = { };
        var levels = [ ];

        for ( var i = 0; i < entries.length; i += 1)
        {
            var entry = entries[ i ];
            while ( entry.__level__ < levels.length ) {
                levels.pop();
            }

            var name = entry.querySelector( '.name' );
            var value = entry.querySelector( '.value' );

            var propName = entry.__propName__ ? entry.__propName__ : nameToProp( name.textContent.trim() ) ;
            var prop = newOptions;
            for ( var j = 0; j < levels.length; j += 1) {
                prop = prop[ levels[ j ] ];
            }

            if ( !value )
            {
                if ( !prop[ propName ] ) {
                    prop[ propName ] = { };
                }
                levels.push( propName );
            }
            else
            {
                value = value.querySelector( 'input' );
                if ( value.type === 'checkbox' ) {
                    prop[ propName ] = value.checked;
                }
                else 
                {
                    value = value.value;
                    prop[ propName ] = value[ 0 ] === '#' ? value : +value;
                }
            }
        }

        return newOptions;
    }

    function nameToProp( aText )
    {
        var nameParts = aText.toLowerCase().split( ' ' );
        for ( var i = 1; i < nameParts.length; i += 1)
        {
            var part = nameParts[ i ];
            nameParts[ i ] = part[ 0 ].toUpperCase() + part.substring( 1 );
        }
        return nameParts.join( '' );
    }

    // reset
    function resetOptions( aOptionsSet )
    {
        for ( var i = 0; i < aOptionsSet.length; i += 1 ) {
            localStorage.removeItem( aOptionsSet[ i ].name );
        }
        window.location.reload();
    }

    app.Options = Options;

})( MEW );

/*! Plant object
 *
 *  Usage: new MEW.Plant(...)
 */

(function (app) {
	'use strict';

    var iOptions = {
        stageDuration: 300,
        
        canGrowInWater: false,
        canGrowInSoil: true,
        height: 40,
        seedCount: 4,
        
        energy: {
            increasePerStep: 0.005,
            decreasePerDensity: 0.010
        },
        
        richnessDep: Math.sqrt,

        // function to map moisture [0..1], while y(0)=0, y(optimalMoisture)=1, 0 < y(1) < 1
        //    a * x        |      *     |
        // -------------   |   *      * |  where 'c' > 1 impacts 'optimalMoisture' (~ 1/c), d > 1 impacts y(1) (~1/d), 
        // b + c * x ^ d   | *          |        'a' = (c * d)^(1/d), and 'b' = 1 - 1/d
        moistureDep: (function () { 
            var c = 1.5,    // moderately wet places
                d = 3,      // small drop for very wet places
                a = Math.pow( c * d, 1 / d),
                b = 1 - 1 / d;
            return function ( aValue ) {
                return (a * aValue) / ( b + c * Math.pow( aValue, d ) );
            };
        })()
    };

    // aGenes as app.Genes object for plants
    // aCell as {col, row}
    // aSoilCell as app.SoilCell
    function Plant( aGenes, aCell, aSoilCell )
    {
        // read-only for externals
        this.ID = sID;
        this.genes = aGenes;
        this.cell = aCell;
        this.age = aSoilCell.isWater && !iOptions.canGrowInWater ? Plant.Age.DEAD : Plant.Age.SEED;
        this.energy = 0.8 + 0.2 * Math.random();    // 00.8 .. 1
        this.isVisble = true;

        // internals
        this.iSoilCell = aSoilCell;
        this.iSeedsDropped = [];
        this.iSeeds = [];
        this.iCurrentStageAge = 0;

        // finilize init
        this.iSoilCell.addPlant( this );

        sID += 1;
    }

    // aNeighbours is Array of app.Plant
    Plant.prototype.increaseAge = function ()
    {
        var energyChange = iOptions.energy.increasePerStep - 
                           iOptions.energy.decreasePerDensity * ( this.iSoilCell.plantDensity - 1 );
        
        this.energy += energyChange; //getEnergyChange( aNeighbours );
        this.energy = app.Utils.limit( this.energy, 0.001, 1 );

        if ( this.energy < 0.2 && this.age <= Plant.Age.SEEDS )
        {
            this.iCurrentStageAge = 0;
            if ( this.age === Plant.Age.SEED ) {
                this.age = Plant.Age.DEAD;
            } else if ( this.age === Plant.Age.SPROUT ) {
                this.age = Plant.Age.OLD;
            } else {
                this.age = Plant.Age.WILTING;
            }
        }

        if ( this.age <= Plant.Age.GROWN ) {
            this.iCurrentStageAge += getGrowingAgeStep( this.energy, this.iSoilCell, this.genes.set );
        } else if ( this.age <= Plant.Age.SEEDS ) {
            this.iCurrentStageAge += getFloweringAgeStep( this.energy, this.iSoilCell, this.genes.set );
        } else {
            this.iCurrentStageAge += 1 / ( 1 + this.energy );
        }

        if ( this.iCurrentStageAge >= iOptions.stageDuration )
        {
            this.age += 1;
            this.iCurrentStageAge = 0;
            if ( this.age === Plant.Age.SEEDS ) {
                createSeeds( this.iSeeds, this.genes, app.Utils.clone( this.cell ) );
            }
        }
        
        if ( this.age === Plant.Age.SEEDS ) {
            tryToDropSeed( this.iSeeds, this.iSeedsDropped, this.iCurrentStageAge / iOptions.stageDuration );
        } 
        else if ( this.age === Plant.Age.DEAD ) {
            this.iSoilCell.removePlant( this.ID );
        }
    };

    // aAmount is number
    Plant.prototype.looseEnergy = function ( aAmount ) {
        this.energy -= aAmount;
    };

    Plant.prototype.getSeeds = function ()
    {
        var seeds = [];
        for ( var seedIndex = 0; seedIndex < this.iSeedsDropped.length; ++seedIndex ) {
            seeds.push( this.iSeedsDropped[ seedIndex ] );
        }
        this.iSeedsDropped = [];
        return seeds;
    };

    Plant.prototype.isEatable = function () {
        return this.energy >= 0.1 && this.age > Plant.Age.SEED;
    };

    Plant.prototype.isVanished = function () {
        return this.age === Plant.Age.DEAD;
    };
    
    Plant.prototype.isSeed = function () {
        return this.age === Plant.Age.SEED;
    };

    // ------------------------------------------------
    // Public static
    // ------------------------------------------------
    Plant.Age = {
        SEED: -1,
        SPROUT: 0,
        GROWING: 1,
        GROWN: 2,
        FLOWERING: 3,
        MATURATION: 4,
        SEEDS: 5,
        WILTING: 6,
        OLD: 7,
        DEAD: 8
    };

    Plant.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    Plant.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    // ------------------------------------------------
    // Private
    // ------------------------------------------------

    function getGrowingAgeStep( aEnergy, aSoilCell, aGenes )
    {
        return aEnergy * 
               iOptions.richnessDep( aSoilCell.richness ) *     // richness up, speed up
               iOptions.moistureDep( aSoilCell.moisture ) /     // moisture up, speed has peak
               Math.sqrt( 0.1 + aGenes.height ) *      // height up, speed down
               Math.sqrt( 0.1 + aGenes.seedSize );     // seedSize up, speed up
    }
        
    function getFloweringAgeStep( aEnergy, aSoilCell, aGenes )
    {
        return aEnergy *
               iOptions.richnessDep( aSoilCell.richness ) *     // richness up, speed up
               iOptions.moistureDep( aSoilCell.moisture ) /     // moisture up, speed has peak
               Math.sqrt( 0.1 + aGenes.seedSize ) /    // seed size up, speed down
               ( 0.1 + aGenes.seedCount ) /            // seed count up, speed down
               Math.sqrt( 0.1 + aGenes.flowerSize );   // flower size up, speed down
    }
    
    function tryToDropSeed( aSeeds, aDropped, aAge )
    {
        var chance = aAge * aAge;
        for ( var i = aSeeds.length - 1; i >= 0; --i )
        {
            if ( Math.random() < chance )
            {
                var seedDropped = aSeeds.splice( i, 1 )[ 0 ];
                seedDropped.drop();
                aDropped.push( seedDropped );
            }
        }
    }
        
    function createSeeds( aSeeds, aGenesObj, aCell )
    {
        var genes = aGenesObj.set;
        var count = Math.round( genes.seedCount * iOptions.seedCount );
        for ( var i = 0; i < count; ++i ) {
            aSeeds.push( new app.Seed( aGenesObj.mutate(), aCell, genes.height * iOptions.height ) );
        }
    }

    function getEnergyChange( aNeighbours )
    {
        var result = 0.005;
        aNeighbours.forEach( function( aCount, aLevel ) {
            result -= 0.006 * aCount / ( 1 + 1 * aLevel );
        } );
        // for ( var level = 0; level < aNeighbours.length; ++level ) {
        //     if ( aNeighbours[ level ] ) {
        //         result -= 0.006 * aNeighbours[ level ] / ( 1 + 1 * level );
        //     }
        // }
        return result;
    }

    // static
    var sID = 0;

    // module export
    app.Plant = Plant;

})( MEW );

/*! Predator < Animal
 *
 *  Usage: new MEW.Predator(...)
 */
 
(function (app) {
    'use strict';

    var iOptions = {
        stageDuration: {
            minimum: 700,
            maximum: 900
        },
        maxChildren: 4,
        energy: {
            decreasePerStep: 0.001,
            hungerThreshold: 0.9,
            foodRate: 2
        },
        relaxedSpeed: 0.3,
        chasingScale: 1.1
    };

    iOptions = app.Utils.extend( true, {}, app.Animal.getOptions(), iOptions );

    var Age = app.Animal.Age;

    // aGenes as app.Genes object for plants
    // aCell as {col, row}
    function Predator( aGenes, aCell )
    {
        app.Animal.call( this, aGenes, aCell, iOptions );
    }

    Predator.prototype = new app.Animal();
    Predator.prototype.base = app.Animal.prototype;
    Predator.prototype.constructor = Predator;

    Predator.prototype.eat = function ( aVeg )
    {
        var eatedEnergy = aVeg.getEnergy();
        this.lastNearestVictim = null;
        
        if ( eatedEnergy > 0 )
        {
            aVeg.kill();
            this.iEnergy = Math.min( this.iEnergy + aVeg.getMass() / iOptions.energy.foodRate, this.iMaxEnergy );
        }
    };

    Predator.prototype.leaveVeg = function ( aVegID )
    {
        if ( this.lastNearestVictim && this.lastNearestVictim.ID === aVegID ) {
            this.lastNearestVictim = null;
        }
    };

    // ------------------------------------------------
    // Public static
    // ------------------------------------------------
    
    Predator.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    Predator.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    // module export
    app.Predator = Predator;

})( MEW );

/*! Estimated process duration
 *
 *  Usage: mew MEW.ProcessDuration()
 */

(function (app) {
    'use strict';

    function ProcessDuration()
    {
        this.avg = 0;
        this.buffer = new Array( 7 );
        this.index = 0;
    }

    ProcessDuration.prototype.add = function ( value ) 
    {
        this.buffer[ this.index ] = value;
        this.index += 1;
        if ( this.index == this.buffer.length )
        {
            this.index = 0;
            var sum = this.buffer.reduce( function( acc, vlaue ) {
                return acc + value;
            });
            this.avg = Math.round( sum / this.buffer.length );
        }
    };

    app.ProcessDuration = ProcessDuration;

})( MEW );

/*! Seed object
 *
 *  Usage: new MEW.Seed(...)
 */

(function (app) {
	'use strict';
    
    // aGenes is app.Genes 
    // aCell as {col, row}
    // aElevation is number
    function Seed( aGenes, aCell, aElevation )
    {
        // read-only for externals
        this.ID = sID;
        this.genes = aGenes;
        this.cell = aCell;
        this.coords = { x: 0, y: 0 };
        this.elevation = aElevation;
        this.isDropped = false;
        this.isVisble = true;
        
        // finilize init
        sID += 1;
    }

    Seed.prototype.drop = function () {
        this.isDropped = true;
    };
        
    // aCoords as {x, y}
    Seed.prototype.moveTo = function ( aCoords ) {
        this.coords.x = aCoords.x;
        this.coords.y = aCoords.y;
    };
        
    // aDistance as {dx, dy}
    // aElevationChange as number
    Seed.prototype.moveBy = function ( aDistance, aElevationChange )
    {
        var seedSize = this.genes.set.seedSize;
        this.coords.x += aDistance.dx / seedSize; //Math.sqrt( 0.1 + seedSize )
        this.coords.y += aDistance.dy / seedSize; //Math.sqrt( 0.1 + seedSize )
        this.elevation = Math.max( 0, this.elevation - aElevationChange * seedSize ); //Math.sqrt( 0.1 + seedSize )
    };


    // static
    var sID = 0;

    // module export
    app.Seed = Seed;

})( MEW );

/*! Soil unit (soil features + lists of unmovable objects for a cell of view)
 *
 *  Usage: new MEW.SoilCell(...)
 */

(function (app) {
	'use strict';

    // params: { richness, moisture }
    // gradient: 
    function SoilCell( aParams )
    {
        this.moisture = aParams.moisture;
        this.richness = aParams.richness;
        this.isWater = false;
        this.plants = [];
        this.plantDensity = 0;
    }

    SoilCell.prototype.addPlant = function ( aPlant ) {
        this.plants.push( aPlant );
    };

    SoilCell.prototype.removePlant = function ( aID )
    {
        for ( var index = this.plants.length - 1; index >= 0; --index ) {
            if ( this.plants[ index ].ID === aID ) {
                this.plants.splice( index, 1 );
                break;
            }
        }
    };

    app.SoilCell = SoilCell;

})( MEW );

/*! Statistics view/controller
 *
 *  Singleton
 *  Usage: new MEW.Statistics(...)
 * 
 *  Required DOM/CSS:
 *      #statistics
 *          .hook
 *          .chapter
 *              h1  [ .active ]
 *              .container  [ .rolled ]
 *                  .names
 *                  .values
 */

(function (app) {
    'use strict';
    
	function Statistics( aWorld, aView )
	{
        iWorld = aWorld;
        iView = aView;
        
		//document.addEventListener( 'DOMContentLoaded', this.init.bind(this) );
	}

    Statistics.Tabs = {
        Count: 0,
        Genes: 1,
        Performance: 2
    };
    
    Statistics.prototype.init = function () 
    {
        iContainer = document.querySelector( '#statistics' );
        if ( !iContainer ) {
            throw new Error( '#statistics does not exist' );
        }

        var hook = iContainer.querySelector( '.hook' );
        hook.addEventListener( 'click', function( e ) {
            iContainer.classList.toggle( 'opened' );
            iIsVisible = !iIsVisible;
        } );

        iChapters = iContainer.querySelectorAll( 'h1' );
        for (var i = 0; i < iChapters.length; i += 1 ) {
            iChapters[ i ].addEventListener( 'click', onChapterClicked );
        }
        
        setInterval( update, 1000 );
    }
    
    
    var iWorld;
    var iView;
    var iContainer;
    var iChapters;
    var iIsVisible = false;
    var iTab = Statistics.Tabs.Count;
    var iKeyRE = /([a-z0-9_]+)([A-Z]{1}|$)/g;

    function onChapterClicked()
    {
        this.nextElementSibling.classList.remove( 'rolled' );
        this.classList.add( 'active' );
        var self = this;
        for (var i = 0; i < iChapters.length; i += 1 )
        {
            var chapter = iChapters[ i ];
            if ( chapter != self )
            {
                chapter.nextElementSibling.classList.add( 'rolled' );
                chapter.classList.remove( 'active' );
            }
            else {
                iTab = i;
            }
        }
    }
    
    function update()
    {
        if ( !iIsVisible ) {
            return;
        }
        
        var names = '';
        var values = '';
        var key, text;
        var stats = iWorld.getStatisticsTab( iTab );
        for (key in stats )
        {
            text = obj2string( '', key, stats[ key ] );
            names += text.names;
            values += text.values;
        }
        
        stats = iView.getStatisticsTab( iTab );
        for (key in stats )
        {
            text = obj2string( '', key, stats[ key ] );
            names += text.names;
            values += text.values;
        }
        
        var container = iChapters[ iTab ].nextElementSibling;
        container.querySelector( '.names' ).textContent = names;
        container.querySelector( '.values' ).textContent = values;
    }

    function obj2string( aPref, aKey, aValue )
    {
        while ( aKey[ 0 ] === '_' ) {
            aPref += '  ';
            aKey = aKey.substr( 1 );
        }
        
        while ( aKey.slice( -1 ) === '_' ) {
            aKey = aKey.slice(0, -1);
        }
        
        var name = aPref + aKey.replace( iKeyRE, '$1 $2' ).toLowerCase();
        var names = '';
        var values = '';
        for (var key in aValue)
        {
            var rest = obj2string( aPref + '  ', key, aValue[ key ] );
            names += rest.names;
            values += rest.values;
        }

        var result;
        if ( names ) {
            result = {
                names: name + '\n' + names + '\n',
                values: '\n' + values + '\n'
            };
        } 
        else 
        {
            result = {
                names: name + '\n',
                values: ( ( aValue % 1 ) === 0  ? aValue : aValue.toFixed( 2 ) ) + '\n'
            };
        }
        return result;
    }
    
    app.Statistics = Statistics;

})( MEW );

/*! Square-based algorithm
 *  http://habrahabr.ru/post/226635/
 *
 *  Usage: new MEW.TerrainGeneratorDS(...)
 */

(function (app) {
    'use strict';

    var iOptions = {
        grain: 12,
        isFlat: false   // set to true to allow smooth areas
    };

    var TerrainGeneratorDS = { };

    TerrainGeneratorDS.create = function ( aSize, aOffset, aScale )
    {
        var width = aSize.width;
        var height = aSize.height;
        
//var startTime = Date.now();
        var data = create( width, height );
//alert( 'Terrain created in ' + (Date.now() - startTime) +  ' ms' );

        var result = new Array( width );
        var offset = aOffset || 0;
        var scale = aScale || 1;
        for ( var col = 0; col < width; ++col )
        {
            result[ col ] = new Array( height );
            for ( var row = 0; row < height; ++row ) {
                result[ col ][ row ] = offset + data[ col ][ row ] * scale;
            }
        }

        return result;
    };
    
    TerrainGeneratorDS.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    TerrainGeneratorDS.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------

    function create( aWidth, aHeight ) 
    {
        var c1 = Math.random(),
            c2 = Math.random(),
            c3 = Math.random(),
            c4 = Math.random();
        
        var heights = [];
        for ( var col = 0; col < aWidth; ++col ) {
            heights.push( new Array( aHeight ) );
        }
        
        divide( heights, 0, 0, aWidth, aHeight, c1, c2, c3, c4, aWidth + aHeight );
        
        return heights;
    }
    
    function divide( r, x, y, w, h, c1, c2, c3, c4, wh )
    {
        var newWidth = w / 2;
        var newHeight = h / 2;
        
        if ( w < 1 && h < 1 )
        {
            var c = (c1 + c2 + c3 + c4) / 4;
            r[ Math.floor( x ) ][ Math.floor( y ) ] = c;
        }
        else
        {
            var middle = (c1 + c2 + c3 + c4) / 4 + displace( newWidth + newHeight, wh );
            var edge1 = (c1 + c2) / 2;
            var edge2 = (c2 + c3) / 2;
            var edge3 = (c3 + c4) / 2;
            var edge4 = (c4 + c1) / 2;

            if ( !iOptions.isFlat ) {
                if ( middle <= 0 ) {
                    middle = 0;
                }
                else if ( middle > 1 ) {
                    middle = 1;
                }
            }
            
            divide( r, x, y, newWidth, newHeight, c1, edge1, middle, edge4, wh );
            divide( r, x + newWidth, y, newWidth, newHeight, edge1, c2, edge2, middle, wh );
            divide( r, x + newWidth, y + newHeight, newWidth, newHeight, middle, edge2, c3, edge3, wh );
            divide( r, x, y + newHeight, newWidth, newHeight, edge4, middle, edge3, c4, wh );
        }
    }

    // random koefficient for the height's offset
    function displace( aNewWH, aWH )
    {
        var max = aNewWH / aWH * iOptions.grain;
        return max * ( Math.random() - 0.5 );
    }

    app.TerrainGeneratorDS = TerrainGeneratorDS;

})( MEW );

/*! Lazy implementation of fractal landscape generation (diamond-square algorithm)
 *  Based on the code by deNULL (me@denull.ru)
 *  http://habrahabr.ru/post/111538/
 *
 *  Singleton
 *  Usage: new MEW.TerrainGeneratorLDS(...)
 */

(function (app) {
    'use strict';

    var iOptions = {
        roughness: 10
    };

    var TerrainGeneratorLDS = { };

    TerrainGeneratorLDS.create = function ( aSize, aOffset, aScale )
    {
        var width = iWidth = aSize.width + 1;
        var height = iHeight = aSize.height + 1;
        var data = iData = [];

        var col, row;
        for ( col = 0; col < width; ++col ) {
            data.push( new Array( height ) );
        }
        
        iSeed = Math.random();
        iRandomParams = {
            a: Math.floor( 1 + Math.random() * 10 ),
            b: Math.floor( 10 + Math.random() * 10 ),
            c: Math.floor( 1000000 + Math.random() * 1000000 ),
            d: Math.floor( 5000 + Math.random() * 5000 ),
            e: Math.floor( 100000 + Math.random() * 100000 ),
            f: Math.floor( 100000 + Math.random() * 100000 ),
            g: Math.floor( 1000000 + Math.random() * 1000000 )
        };

// var startTime = Date.now();
        for ( col = 0; col < width; ++col ) {
            for ( row = 0; row < height; ++row ) {
                computeValue( col + 1, row + 1 );
            }
        }
// alert( 'Terrain created in ' + (Date.now() - startTime) +  ' ms' );

        var result = new Array( width );
        var offset = aOffset || 0;
        var scale = aScale || 1;
        for ( col = 0; col < width - 1; ++col ) 
        {
            result[ col ] = new Array( height );
            for ( row = 0; row < height - 1; ++row ) {
                result[ col ][ row ] = offset + iData[ col + 1 ][ row + 1 ] * scale;
            }
        }

        return result;
    };

    TerrainGeneratorLDS.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    TerrainGeneratorLDS.getOptions = function () {
        return app.Utils.clone( iOptions );
    };
    
    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------

    var iWidth;
    var iHeight;
    var iRandomParams;
    var iSeed;
    var iData;

    function setValue( x, y, value) {
        iData[ x ][ y ] = Math.max( 0, Math.min( 1, value ) );
    }

    function getValue( x, y )
    {
        if ( x <= 0 || x >= iWidth || y <= 0 || y >= iHeight ) {
            return 0;
        }

        if ( iData[ x ][ y ] === undefined ) {
            computeValue( x, y );
        }

        return iData[ x ][ y ];
    }

    function computeValue( x, y )
    {
        if ( x <= 0 || x >= iWidth || y <= 0 || y >= iHeight ) {
            return;
        }

        var base = 1;
        while ( ( ( x & base ) === 0 ) && ( ( y & base ) === 0 ) ) {
            base <<= 1;
        }

        if ( ( ( x & base ) !== 0 ) && ( ( y & base ) !== 0 ) ) {
            squareStep( x, y, base );
        } else {
            diamondStep( x, y, base );
        }
    }

    function randomFromPair( x, y )
    {
        var x1, x2, x3, y1, y2, y3;
        for ( var i = 0; i < 80; ++i )
        {
            x1 = x % iRandomParams.a;
            x2 = x % iRandomParams.b;
            x3 = x % iRandomParams.c;
            y1 = y % iRandomParams.d;
            y2 = y % iRandomParams.e;
            y3 = y % iRandomParams.f;
            //y = (i < 40 ? iSeed : x);
            y = x + iSeed;
            x += (x1 + x2 + x3 + y1 + y2 + y3);
        }

        return (x1 + x2 + x3 + y1 + y2 + y3) / iRandomParams.g;
    }

    function displace( value, blockSize, x, y ) {
        return ( value + ( randomFromPair( x, y, iSeed ) - 0.5 ) * blockSize * 2 / iWidth * iOptions.roughness );    // iWidth < size
    }

    function squareStep( x, y, blockSize ) 
    {
        if ( iData[ x ][ y ] === undefined ) {
            setValue( x, y, displace( ( getValue( x - blockSize, y - blockSize ) +
                                          getValue( x + blockSize, y - blockSize ) +
                                          getValue( x - blockSize, y + blockSize ) +
                                          getValue( x + blockSize, y + blockSize) ) / 4, blockSize, x, y) );
        }
    }

    function diamondStep( x, y, blockSize )
    {
        if ( iData[ x ][ y ] === undefined ) {
            setValue( x, y, displace( ( getValue( x - blockSize, y ) +
                                          getValue( x + blockSize, y ) +
                                          getValue( x, y - blockSize ) +
                                          getValue( x, y + blockSize ) ) / 4, blockSize, x, y) );
        }
    }

    app.TerrainGeneratorLDS = TerrainGeneratorLDS;

})( MEW );

/*! Perlin noise -based terrain generator
 *  http://habrahabr.ru/post/142592/
 *
 *  Singleton
 *  Usage: new MEW.TerrainGeneratorPN(...)
 */

(function (app) {
    'use strict';

    var iOptions = {
        persistence: 0.5
    };

    var TerrainGeneratorPN = { };

    TerrainGeneratorPN.create = function ( aSize, aOffset, aScale )
    {
        var width = aSize.width;
        var height = aSize.height;
        
        var octaveCount = Math.max( width, height ) / 10;
        iRandomParams = {
            a: 10000 + Math.random() * 10000,
            b: 700000 + Math.random() * 100000,
            c: 1000000000 + Math.random() * 500000000,
            d: 1000000000 + Math.random() * 100000000
        };

// var startTime = Date.now();
        var result = new Array( width );
        var offset = aOffset || 0;
        var scale = aScale || 1;
        for ( var col = 0; col < width; ++col )
        {
            result[ col ] = new Array( height );
            for ( var row = 0; row < height; ++row ) {
                result[ col ][ row ] = offset + create( col / width, row / height, octaveCount ) * scale;
            }
        }
// alert( 'Terrain created in ' + (Date.now() - startTime) +  ' ms' );

        return result;
    };
    
    TerrainGeneratorPN.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    TerrainGeneratorPN.getOptions = function () {
        return app.Utils.clone( iOptions );
    };
    
    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------

    var iRandomParams;

    function getNoise( x, y )
    {
        var n = x + y * 57;
        n = ( n << 13 ) ^ n;
        return ( 1.0 - ( (n * (n * n * iRandomParams.a + iRandomParams.b) + iRandomParams.c) & 0x7fffffff) / iRandomParams.d );
    }

    function getSmoothedNoise( x, y )
    {
        var corners = ( getNoise( x-1, y-1 ) + getNoise( x+1, y-1 ) + getNoise( x-1, y+1 ) + getNoise( x+1, y+1 ) ) / 16;
        var sides   = ( getNoise( x-1, y ) + getNoise( x+1, y ) + getNoise( x, y-1 ) + getNoise( x, y+1 ) ) / 8;
        var center  = getNoise( x, y ) / 4;
        return corners + sides + center;
    }

    function interpolate( a, b, x )
    {
        var ft = x * Math.PI;
        var f = (1 - Math.cos( ft )) * 0.5;
        return  a * (1-f) + b * f;
    }

    function getInterpolatedNoise( x, y )
    {
        var intX  = Math.floor( x );
        var fracX = x - intX;
        var intY  = Math.floor( y );
        var fracY = y - intY;
        var v1 = getSmoothedNoise( intX, intY );
        var v2 = getSmoothedNoise( intX + 1, intY );
        var v3 = getSmoothedNoise( intX, intY + 1 );
        var v4 = getSmoothedNoise( intX + 1, intY + 1 );
        var i1 = interpolate( v1, v2, fracX );
        var i2 = interpolate( v3, v4, fracX );
        return interpolate( i1, i2, fracY );
    }

    function create( aX, aY, aOctaveCount )
    {
        var result = 0;
        var totalAmp = 0;
        var frequency = 2;
        var amplitude = 1;

        for ( var i = 0; i < aOctaveCount; ++i )
        {
            result += getInterpolatedNoise( aX * frequency, aY * frequency ) * amplitude;
            totalAmp += amplitude;
            
            frequency *= 2;
            amplitude *= iOptions.persistence;

            if (amplitude < 0.05) {
                break;
            }
        }

        return 0.5 + result;
    }

    app.TerrainGeneratorPN = TerrainGeneratorPN;

})( MEW );

/*! Vegeterian < Animal
 *
 *  Usage: new MEW.Vegeterian(...)
 */
 
(function (app) {
    'use strict';

    var iOptions = {
        stageDuration: {
            minimum: 700,
            maximum: 900
        },
        maxDeliveryCount: 3,
        maxChildren: 6,
        energy: {
            decreasePerStep: 0.002,
            foodRate: 7
        },
        relaxedSpeed: 0.5
    };

    iOptions = app.Utils.extend( true, {}, app.Animal.getOptions(), iOptions );

    var Age = app.Animal.Age;

    // aGenes as app.Genes object for plants
    // aCell as {col, row}
    function Vegeterian( aGenes, aCell )
    {
        app.Animal.call( this, aGenes, aCell, iOptions );
    }

    Vegeterian.prototype = new app.Animal();    // tests show that Object.create( appAnimal ) is slower
    Vegeterian.prototype.base = app.Animal.prototype;
    Vegeterian.prototype.constructor = Vegeterian;

    Vegeterian.prototype.eat = function ( aPlant ) {
        this.iVictim = aPlant;
    };

    Vegeterian.prototype.leavePlant = function ( aPlantID )
    {
        if ( this.iVictim && this.iVictim.ID === aPlantID ) {
            this.iVictim = null;
        }
        if ( this.lastNearestVictim && this.lastNearestVictim.ID === aPlantID ) {
            this.lastNearestVictim = null;
        }
    };

    // ------------------------------------------------
    // Public static
    // ------------------------------------------------
    
    Vegeterian.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    Vegeterian.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    // module export
    app.Vegeterian = Vegeterian;

})( MEW );

/*! Wind simulator
 *
 *  Singleton
 *  Usage: new MEW.Wind(...)
 */

(function (app) {
    'use strict';

    var iOptions = {
        updateInterval: 1000
    };

    function Wind( aOptions )
    {
        app.Utils.extend( true, iOptions, aOptions );

        // private members
        this.iStrength = Math.pow( Math.random(), 2 );
        this.iDirection = Math.random();

        setInterval( calcNextParams.bind(this), iOptions.updateInterval );
    }

    Wind.prototype.getDirection = function () {
        return this.iDirection * Math.PI * 2;
    };

    Wind.prototype.getStrength = function () {
        return this.iStrength;
    };

    // ------------------------------------------------
    // Static
    // ------------------------------------------------

    Wind.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    Wind.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    // ------------------------------------------------
    // Private
    // ------------------------------------------------

    function calcNextParams()
    {
        //iDirection = 2.8 * iDirection * ( 1 - iDirection );   // attractor

        // var delta = app.Utils.randomInRange( -1, 1 );
        // iDirection += delta / ( 1 + Math.abs( delta ) );    // sigmoid

        var dirDelta = Math.pow( Math.random(), 2 ) / 6;
        this.iDirection += ( Math.random() > 0.5 ? 1 : -1 ) * dirDelta;

        var strDelta = Math.pow( Math.random(), 2 ) / 4;
        if ( Math.random() > ( 0.5 + 0.5 * this.iStrength ) ) {
             strDelta *= (1 - this.iStrength);
        } else {
             strDelta *= -this.iStrength;
        }

        this.iStrength = Math.max( 0, this.iStrength + strDelta );
    }

    // function createCyclon( aPrevAngle )
    // {
    //     iStep = 0;

    //     var cyclon = {
    //         radius: app.Utils.randomInRange( 0.6, 1 ),
    //         angle: ( typeof aPrevAngle !== 'undefined' ? aPrevAngle + app.Utils.randomInRange( -0.5, 0.5 ) * Math.PI : app.Utils.randomInRange( -1, 1 ) * Math.PI ),
    //         direction: Math.random() < 0.5 ? -1 : 1,
    //         rotationSpeed: app.Utils.randomInRange( 0.2, 1 ),
    //         distanceToCenter: app.Utils.randomInRange( 0, 0.8 ) // fraction or radius
    //     };

    //     var asinDist2Center = Math.asin( cyclon.distanceToCenter );
    //     var side = Math.random() < 0.5 ? -1 : 1;
    //     cyclon.entryAngle = cyclon.angle + side * asinDist2Center;
    //     cyclon.exitAngle = cyclon.angle - Math.PI - side * asinDist2Center;
    //     cyclon.entry = {
    //         x: Math.cos( cyclon.entryAngle ),
    //         y: Math.sin( cyclon.entryAngle )
    //     };
    //     cyclon.exit = {
    //         x: Math.cos( cyclon.exitAngle ),
    //         y: Math.sin( cyclon.exitAngle )
    //     };

    //     var dx = cyclon.exit.x - cyclon.entry.x;
    //     var dy = cyclon.exit.y - cyclon.entry.y;
    //     cyclon.moveStepCount = app.Utils.randomInRange( 2, 20 );
    //     cyclon.step = {
    //         x: dx / cyclon.moveStepCount,
    //         y: dy / cyclon.moveStepCount
    //     };

    //     iCyclon = cyclon;
    // }

    // function getNextParams()
    // {
    //     var x = iCyclon.entry.x + iCyclon.step.x * iStep;
    //     var y = iCyclon.entry.y + iCyclon.step.y * iStep;
    //     var distance = Math.sqrt( x * x + y * y );
    //     var angle = Math.atan2( y, x );
    //     var rotationSpeed = distance2speed( distance ) * iCyclon.rotationSpeed * iCyclon.radius;
    //     var speedX = 1 / iCyclon.moveStepCount * Math.cos( iCyclon.angle ) + rotationSpeed * Math.sin( angle ) * iCyclon.direction / 2;
    //     var speedY = 1 / iCyclon.moveStepCount * Math.sin( iCyclon.angle ) + rotationSpeed * Math.cos( angle ) * iCyclon.direction / 2;

    //     iDirection = Math.atan2( speedY, speedX );
    //     iStrength = Math.sqrt( speedX * speedX + speedY * speedY ) * iOptions.maxStrength;

    //     iStep++;
    //     if ( iStep > iCyclon.moveStepCount) {
    //         createCyclon( iCyclon.angle );
    //     }
    // }

    // function distance2speed( aDistance ) {
    //     return 4 * ( -aDistance * aDistance + aDistance );
    // }

    // var iTimer;

    // var iCyclon;
    // var iStep;

    app.Wind = Wind;

})( MEW );

/*! World model, the main module
 *
 *  Singleton
 *  Usage: new MEW.World(...)
 */
 
(function (app) {
    'use strict';

    var iOptions = {
        size: {
            width: 400,     // cells
            height: 300     // cells
        },
        soil: {
            richness: {
                range: { min: 0.1, max: 1.0 }
            },
            moisture: {
                range: { min: 0.1, max: 1.0 }
            },
            fertilization: 0.0,        // 0..1 (added to richness, per plant; 0 to disable)
            dehydration: 0.0           // 0..1 (subtracted from moisture, per plant; 0 to disable)
        },
        plants: {
            neighboursAffect: 1,        // cells
            areaPerInitUnit: 50         // cells^2 / unit
        },
        vegeterians: {
            windMoveScale: 2,           // pixels
            maxVisionDistance: 7,       // cells
            maxMoveSpeed: 6,            // pixels
            maxAngleChange: 0.4,        // pixels
            areaPerInitUnit: 900        // cells^2 / unit
        },
        predators: {
            windMoveScale: 0.7,         // pixels
            maxVisionDistance: 18,      // cells
            maxMoveSpeed: 6,            // pixels
            maxAngleChange: 0.2,        // pixels
            areaPerInitUnit: 5000       // cells^2 / unit
        },
        seeds: {
            moveScale: 2,       // cells
            dropScale: 0.3      // units
        },
        infection: {
            vegeterians: {
                enabled: true,
                appearanceRate: 0.0001
            },
            predators: {
                enabled: true,
                appearanceRate: 0.0001,
                populationFactor: 1/20
            },
            deseaseRate: 0.3,
            speedRate: 0.5
        },
        agingInterval: 40       // ms
    };

    function World( aOptions )
    {
        app.Utils.extend( true, iOptions, aOptions );
        
        iWind = new app.Wind();
        iHighLoadIndicator = new app.HighLoadIndicator();
        iMsecPerStep = new app.ProcessDuration();

        initSoil();
        initPlants();
        initVegeterians();
        initPredators();

        iEventHandlers[ 'cellUpdate' ] = [];
    }

    World.prototype.start = function ()
    {
        var i;
        for ( i = 0; i < iVegeterians.length; ++i )
        {
            var vegeterian = iVegeterians[ i ];
            vegeterian.coords = cell2coords( vegeterian.cell );
        }
        for ( i = 0; i < iPredators.length; ++i )
        {
            var predator = iPredators[ i ];
            predator.coords = cell2coords( predator.cell );
        }

        iCycle = increaseAge.bind( this );
        setTimeout( iCycle, iOptions.agingInterval );
    };

    World.prototype.addEventHandler = function ( aName, aCallback ) 
    {
        if ( iEventHandlers[ aName ] instanceof Array ) {
            iEventHandlers[ aName ].push( aCallback );
        } else {
            throw new Error( 'No sich event: ' + aName );
        }
    };

    World.prototype.setCellSize = function( aValue ) {
        iFieldView = {
            width: aValue * iOptions.size.width,
            height: aValue * iOptions.size.height,
            cellSize: aValue
        };
    };
    
    World.prototype.getWidth = function () {
        return iOptions.size.width;
    };

    World.prototype.getHeight = function () {
        return iOptions.size.height;
    };

    World.prototype.getSoilCell = function ( aCol, aRow ) {
        return iField[ aCol ][ aRow ];
    };

    World.prototype.getPlants = function () {
        return iPlants;
    };

    World.prototype.getSeeds = function () {
        return iSeeds;
    };

    World.prototype.getVegeterians = function () {
        return iVegeterians;
    };

    World.prototype.getPredators = function () {
        return iPredators;
    };

    World.prototype.getWind = function () {
        return {
            direction: iWind.getDirection(),
            strength: iWind.getStrength()
        };
    };

    World.prototype.isHighLoad = function () {
        return iHighLoadIndicator.isSet();
    };

    World.prototype.getStatisticsTab = function ( aTab )
    {
        switch ( aTab ) {
        case app.Statistics.Tabs.Count:
            return {
                plants: iPlants.length,
                _seeds: iPlantsAsSeeds,
                _visible: ( iPlants.length - iPlantsAsSeeds ),
                seeds: iSeeds.length,
                vegs: iVegeterians.length,
                _infected: iInfectedVegs.length,
                preds: iPredators.length,
                _infected_: iInfectedPreds.length,
                total: ( iPlants.length + iSeeds.length + iVegeterians.length + iPredators.length )
            };
        case app.Statistics.Tabs.Genes:
            return {
                plants: getGenesStats( iPlants, app.Genes.forPlant().set ),
                vegs: getGenesStats( iVegeterians, app.Genes.forVegeterian().set ),
                preds: getGenesStats( iPredators, app.Genes.forPredator().set )
            };
        case app.Statistics.Tabs.Performance:
            return {
                msPerStep: iMsecPerStep.avg
            };
        default:
            throw new Error('Unknown tab ID');
        }
    };

    World.prototype.showEndNotification = function ( aWinner )
    {
        var self = this;
        app.Message.show( aWinner + ' win!', [
            {
                title: 'Continue',
                callback: function () {
                    iCheckForWin = false;
                    self.start();
                }
            },
            {
                title: 'Restart',
                callback: function () {
                    initPlants();
                    initVegeterians();
                    initPredators();
                    self.start();
                }
            },
            {
                title: 'Add extinted',
                callback: function () {
                    if ( !iPlants.length ) {
                        initPlants();
                    }
                    if ( !iVegeterians.length ) {
                        initVegeterians();
                    }
                    if ( !iPredators.length ) {
                        initPredators();
                    }
                    self.start();
                }
            }
        ] );
    };

    World.setOptions = function ( aOptions ) {
        app.Utils.extend( true, iOptions, aOptions );
    };

    World.getOptions = function () {
        return app.Utils.clone( iOptions );
    };

    // ------------------------------------------------------
    // Private
    // ------------------------------------------------------

    var iWind;
    var iHighLoadIndicator;
    var iField = [];
    var iPlants = [];
    var iSeeds = [];
    var iVegeterians = [];
    var iPredators = [];
    var iEventHandlers = {};

    var iFieldView = {
        width: 8 * iOptions.size.width,
        height: 8 * iOptions.size.height,
        cellSize: 8
    };

    var iWaterThreshold = 0.8;
    
    var iPlantsAsSeeds = 0;
    var iMsecPerStep;

    var iCheckForWin = true;
    var iCycle;
    var iInfectedVegs = [];
    var iInfectedPreds = [];

    function isOutOfField( aCoords ) {
        return aCoords.x < 0 || iFieldView.width <= aCoords.x || aCoords.y < 0 || iFieldView.height <= aCoords.y;
    }

    function validateCoords( aCoords ) 
    {
        var x = app.Utils.limit( aCoords.x, 0, iFieldView.width - 1 );
        var y = app.Utils.limit( aCoords.y, 0, iFieldView.height - 1 );
        return {
            isCorrected: x !== aCoords.x || y !== aCoords.y,
            coords: {
                x: x,
                y: y
            }
        };
    }
    function cell2coords( aCell ) {
        return { 
            x: (aCell.col + 0.5 ) * iFieldView.cellSize, 
            y: (aCell.row + 0.5 ) * iFieldView.cellSize 
        };
    }

    function coords2cell( aCoords ) {
        return { 
            col: Math.floor( aCoords.x / iFieldView.cellSize ), 
            row: Math.floor( aCoords.y / iFieldView.cellSize )
        };
    }

    function initSoil()
    {
        var col, row, soilCell;

        var richness = app.TerrainGenerator.create( iOptions.size, 0.4, 1 );
        var moisture = app.TerrainGenerator.create( iOptions.size );
        
        var richnessRange = iOptions.soil.richness.range;
        var moistureRange = iOptions.soil.moisture.range;

        var avgMoisture = 0;
//var startTime = (new Date()).getTime();
        for ( col = 0; col < iOptions.size.width; ++col ) 
        {
            iField.push( new Array( iOptions.size.height ) );
            for ( row = 0; row < iOptions.size.height; ++row ) 
            {
                var soilParams = {
                    richness: app.Utils.limit( richness[ col ][ row ], richnessRange.min, richnessRange.max ),
                    moisture: app.Utils.limit( moisture[ col ][ row ], moistureRange.min, moistureRange.max )
                };
                soilCell = new app.SoilCell( soilParams );
                iField[ col ][ row ] = soilCell;
                avgMoisture += soilParams.moisture;
            }
        }
//alert( 'Soil initialized in ' + ((new Date()).getTime() - startTime) +' ms' );
        
        avgMoisture = avgMoisture / iOptions.size.width / iOptions.size.height;
        iWaterThreshold = 0.3 + 0.7 * avgMoisture;
        for ( col = 0; col < iOptions.size.width; ++col ) {
            for ( row = 0; row < iOptions.size.height; ++row ) {
                soilCell = iField[ col ][ row ];
                soilCell.isWater = soilCell.moisture >= iWaterThreshold;
            }
        }
    }

    function initPlants()
    {
        iPlants = [];
        iSeeds = [];
        var initCount = Math.round( iOptions.size.width * iOptions.size.height / iOptions.plants.areaPerInitUnit );
        var options = app.Plant.getOptions();
        for ( var i = 0; i < initCount; ++i )
        {
            var field = findProperField( options.canGrowInWater, options.canGrowInSoil );
            var plant = new app.Plant( app.Genes.forPlant(), field.cell, field.soilCell );
            addPlant( plant );
        }
    }

    function initVegeterians()
    {
        iVegeterians = [];
        var initCount = Math.round( iOptions.size.width * iOptions.size.height / iOptions.vegeterians.areaPerInitUnit );
        var options = app.Vegeterian.getOptions();
        for ( var i = 0; i < initCount; ++i )
        {
            var field = findProperField( options.canGrowInWater, options.canGrowInSoil );
            var vegeterian = new app.Vegeterian( app.Genes.forVegeterian(), field.cell );
            iVegeterians.push( vegeterian );
        }
    }

    function initPredators()
    {
        iPredators = [];
        var initCount = Math.round( iOptions.size.width * iOptions.size.height / iOptions.predators.areaPerInitUnit );
        var options = app.Predator.getOptions();
        for ( var i = 0; i < initCount; ++i )
        {
            var field = findProperField( options.canGrowInWater, options.canGrowInSoil );
            var predator = new app.Predator( app.Genes.forPredator(), field.cell );
            iPredators.push( predator );
        }
    }

    function findProperField( aIsWaterAcceptable, aIsSoilAcceptable )
    {
        var cell;
        var soilCell;
        do {
            cell = {
                col: Math.floor( app.Utils.randomInRange( 1, iOptions.size.width - 1 ) ),
                row: Math.floor( app.Utils.randomInRange( 3, iOptions.size.height - 1 ) )
            };
            soilCell = iField[ cell.col ][ cell.row ];
        } while ( ( soilCell.isWater && !aIsWaterAcceptable ) || (!soilCell.isWater && !aIsSoilAcceptable ) );

        return {
            cell: cell,
            soilCell: soilCell
        };
    }

    function addPlant( aPlant )
    {
        iPlants.push( aPlant );
        modifyPlantDensity( aPlant.cell, 1 );
    }
    
    function removePlant( aIndex )
    {
        var plant = iPlants.splice( aIndex, 1 )[ 0 ];
        for ( var vegIndex = 0; vegIndex < iVegeterians.length; ++vegIndex ) {
            iVegeterians[ vegIndex ].leavePlant( plant.ID );
        }
        modifyPlantDensity( plant.cell, -1 );
        
        var fert = iOptions.soil.fertilization;
        var dehyd = iOptions.soil.dehydration;
        if ( fert > 0 || dehyd > 0 )
        {
            var soilCell = iField[ plant.cell.col ][ plant.cell.row ];
            soilCell.richness = Math.min( 1, soilCell.richness + plant.energy * fert );
            soilCell.moisture = Math.max( 0.1, soilCell.moisture - dehyd );
            var handlers = iEventHandlers[ 'cellUpdate' ];
            for (var i = 0; i < handlers.length; ++i ) {
                handlers[ i ]( plant.cell.col, plant.cell.row );
            }
        }
    }
    
    function modifyPlantDensity( aCell, aCoef )
    {
        var maxDist = iOptions.plants.neighboursAffect;
        var colMin = Math.max( aCell.col - maxDist, 0 ),
            colMax = Math.min( aCell.col + maxDist, iOptions.size.width ),
            rowMin = Math.max( aCell.row - maxDist, 0 ),
            rowMax = Math.min( aCell.row + maxDist, iOptions.size.height );

        for (var col = colMin; col < colMax; ++col )
        {
            var fieldCol = iField[ col ];
            for (var row = rowMin; row < rowMax; ++row )
            {
                var dist = Math.abs( col - aCell.col ) + Math.abs( row - aCell.row );
                fieldCol[ row ].plantDensity += aCoef / ( 1 + dist );
            }
        }
    }
    
    function isGameEnd()
    {
        if ( !iPlants.length && !iSeeds.length && !iVegeterians.length && !iPredators.length )
        {
            app.Message.show( 'The life has extincted' );
            return 'nobody';
        }
        else if ( iCheckForWin )
        {
            var onlyLeft = '';
            if ( (iPlants.length || iSeeds.length) && !iVegeterians.length && !iPredators.length ) {
                onlyLeft = 'Plants';
            } else if ( !(iPlants.length || iSeeds.length) && iVegeterians.length && !iPredators.length ) {
                onlyLeft = 'Vegeterians';
            } else if ( !(iPlants.length || iSeeds.length) && !iVegeterians.length && iPredators.length ) {
                onlyLeft = 'Predators';
            }

            return onlyLeft;
        }
        
        return false;
    }

    function increaseAge()
    {
        var timestamp = Date.now();

        increasePlantsAge();
        increaseVegeteriansAge();
        increasePredatorsAge();

        removeDeadInfected();
        
        moveSeeds();
        moveVegeterians();
        movePredators();
        
        var winner = isGameEnd();
        if ( winner )
        {
            if ( iCheckForWin ) {
                this.showEndNotification( winner );
            }
            return;
        }
        
        var duration = Date.now() - timestamp;
        iMsecPerStep.add( duration );
        var interval = iOptions.agingInterval - duration;
        
        if ( interval < 0 )
        {
            interval = 0;
            iHighLoadIndicator.notify();
        }

        setTimeout( iCycle, interval );
    }
    
    function increasePlantsAge()
    {
        iPlantsAsSeeds = 0;
        for ( var plantIndex = iPlants.length - 1; plantIndex >= 0; --plantIndex )
        {
            var plant = iPlants[ plantIndex ];
            plant.increaseAge();
            if ( plant.isVanished() ) {
                removePlant( plantIndex );
            }
            else
            {
                var seeds = plant.getSeeds();
                for ( var seedIndex = 0; seedIndex < seeds.length; ++seedIndex )
                {
                    var seed = seeds[ seedIndex ];
                    seed.moveTo( cell2coords( seed.cell ) );
                    iSeeds.push( seed );
                }
            }
            if ( plant.isSeed() ) {
                iPlantsAsSeeds++;
            }
        }
    }
    
    function increaseVegeteriansAge()
    {
        for ( var vegIndex = iVegeterians.length - 1; vegIndex >= 0; --vegIndex )
        {
            var vegeterian = iVegeterians[ vegIndex ];
            vegeterian.increaseAge();
            if ( vegeterian.isDead() ) {
                iVegeterians.splice( vegIndex, 1 );
            }
            else 
            {
                var children = vegeterian.getChildren();
                for ( var childIndex = 0; childIndex < children.length; ++childIndex ) 
                {
                    var child = children[ childIndex ];
                    iVegeterians.push( child );
                }
                var infection = iOptions.infection.vegeterians;
                if ( infection.enabled && Math.random() < infection.appearanceRate ) {
                    vegeterian.isInfected = true;
                    iInfectedVegs.push( vegeterian );
                }
            }
        }
    }
    
    function increasePredatorsAge()
    {
        var infectionOptions = iOptions.infection.predators;
        var infectionRate = infectionOptions.appearanceRate * ( 1 + infectionOptions.populationFactor * iPredators.length );
        for ( var predIndex = iPredators.length - 1; predIndex >= 0; --predIndex )
        {
            var predator = iPredators[ predIndex ];
            predator.increaseAge();
            if ( predator.isDead() ) {
                iPredators.splice( predIndex, 1 );
            }
            else {
                var children = predator.getChildren();
                for ( var childIndex = 0; childIndex < children.length; ++childIndex ) {
                    var child = children[ childIndex ];
                    iPredators.push( child );
                }
                if ( iOptions.infection.predators.enabled && Math.random() < infectionRate ) {
                    predator.isInfected = true;
                    iInfectedPreds.push( predator );
                }
            }
        }
    }

    function removeDeadInfected()
    {
        var i;
        for ( i = iInfectedVegs.length - 1; i >= 0; i -= 1 ) {
            if ( iInfectedVegs[ i ].isDead() ) {
                iInfectedVegs.splice( i, 1 );
            }
        }
        for ( i = iInfectedPreds.length - 1; i >= 0; i -= 1 ) {
            if ( iInfectedPreds[ i ].isDead() ) {
                iInfectedPreds.splice( i, 1 );
            }
        }
    }
    
    function moveSeeds()
    {
        if ( !iSeeds.length ) {
            return;
        }

        var windStrength = iWind.getStrength();
        var windDirection = iWind.getDirection();
        var moveScale = iOptions.seeds.moveScale;
        var baseMove = {
            cols: moveScale * windStrength * Math.cos( windDirection ),
            rows: moveScale * windStrength * Math.sin( windDirection )
        };

        var dropScale = iOptions.seeds.dropScale;
        var baseElevationChange = dropScale * (1 - windStrength * ( 1 + windStrength ) );
        
        var random = app.Utils.randomInRange;
        for ( var seedIndex = iSeeds.length - 1; seedIndex >= 0; --seedIndex )
        {
            // move individually
            var seed = iSeeds[ seedIndex ];
            var move = {
                dx: Math.round( baseMove.cols + random( -1, 1 ) * moveScale ), //(2 * Math.random() - 1) * moveScale ),
                dy: Math.round( baseMove.rows + random( -1, 1 ) * moveScale )  //(2 * Math.random() - 1) * moveScale )
            };
            var elevationChange = baseElevationChange + dropScale * ( 0.3 + 0.7 * Math.random() - windStrength ); // random( 0.3 - windStrength, 1 - windStrength )
            seed.moveBy( move, elevationChange );

            // find dropped seeds, get new plats is possible
            if ( seed.elevation <= 0 )
            {
                iSeeds.splice( seedIndex, 1 );

                var seedNewCoords = seed.coords;
                if ( !isOutOfField( seedNewCoords ) )
                {
                    var seedCell = coords2cell( seedNewCoords );
                    var soilCell = iField[ seedCell.col ][ seedCell.row ];
                    var plant = new app.Plant( seed.genes, seedCell, soilCell );
                    addPlant( plant );
                }
            }
        }
    }

    function moveVegeterians()
    {
        if (!iVegeterians.length) {
            return;
        }

        var windMove = getMoveByWind( iOptions.vegeterians.windMoveScale );

        for ( var vegIndex = iVegeterians.length - 1; vegIndex >= 0; --vegIndex )
        {
            var vegeterian = iVegeterians[ vegIndex ];
            var isChased = vegeterian.isChased();
            if ( vegeterian.isEating() && !isChased ) {
                continue;
            }

            moveAnimal( vegeterian, iOptions.vegeterians, windMove, null );

            tryToSpreadInfection( iInfectedVegs, vegeterian );
        }
    }

    function movePredators()
    {
        if (!iPredators.length) {
            return;
        }

        var windMove = getMoveByWind( iOptions.predators.windMoveScale );

        for ( var predIndex = iPredators.length - 1; predIndex >= 0; --predIndex )
        {
            var predator = iPredators[ predIndex ];
            moveAnimal( predator, iOptions.predators, windMove, iVegeterians );

            tryToSpreadInfection( iInfectedPreds, predator );
        }
    }

    function moveAnimal( aAnimal, aMoveOptions, aWindMove, aMovableVictimList )
    {
        var moveDistance = getAnimalMoveSpeed( aAnimal ) * aMoveOptions.maxMoveSpeed;

        var moveAngle = null;
        var nearestVictim = null;

        if ( aAnimal.isHungry() && !aAnimal.isChased() )
        {
            nearestVictim = getNearestVictim( aAnimal, aAnimal.getSensorSize() * aMoveOptions.maxVisionDistance, aMovableVictimList );
            if ( nearestVictim )
            {
                var chasingResult = chaseVictim( nearestVictim.cell, aAnimal, moveDistance );
                moveDistance = chasingResult.distance;
                moveAngle = chasingResult.angle;
                if ( chasingResult.gotIt ) {
                    aAnimal.eat( nearestVictim );
                    if ( aMovableVictimList ) {
                        nearestVictim = null;
                    }
                }
            }
        }
        
        if ( !moveAngle ) {
            moveAngle = aAnimal.lastMoveAngle + app.Utils.randomInRange( -aMoveOptions.maxAngleChange, aMoveOptions.maxAngleChange );
        }
        
        var move = {
            dx: aWindMove.dx + moveDistance * Math.cos( moveAngle ),
            dy: aWindMove.dy + moveDistance * Math.sin( moveAngle )
        };

        var hasMoved = tryToMoveAnimal( aAnimal, move, moveAngle );
        if ( nearestVictim ) {
            aAnimal.setVictim( hasMoved, nearestVictim );
        }
    }

    function getAnimalMoveSpeed( aAnimal )
    {
        var moveSpeed = aAnimal.getMoveSpeed();
        if ( aAnimal.isInfected ) {
            moveSpeed *= iOptions.infection.speedRate;
        }
        return moveSpeed;
    }

    function tryToMoveAnimal( aAnimal, aMove, aAngle )
    {
        var newVegCoords = { x: aAnimal.coords.x + aMove.dx, y: aAnimal.coords.y + aMove.dy };
        var validation = validateCoords( newVegCoords );
        if ( validation.isCorrected ) 
        {
            newVegCoords = validation.coords;
            aAngle += Math.PI / 2 + Math.random() * Math.PI;
        }
        
        var newVegCell = coords2cell( newVegCoords );
        var isWaterCell = iField[ newVegCell.col ][ newVegCell.row ].isWater;
        
        return aAnimal.moveTo( newVegCoords, newVegCell, aAngle, isWaterCell );
    }

    function chaseVictim( aVictimCell, aChaser, aMoveDistance )
    {
        var victimCoords = cell2coords( aVictimCell );
        var angle = app.Utils.randomInRange( -0.1, 0.1 );
        var gotIt = false;

        if ( aChaser.cell.col !== aVictimCell.col || aChaser.cell.row !== aVictimCell.row )
        {
            var dx = victimCoords.x - aChaser.coords.x,
                dy = victimCoords.y - aChaser.coords.y;
            var dist = Math.sqrt( dx * dx + dy * dy );
            aMoveDistance = Math.min( aMoveDistance, dist );
            angle += Math.atan2( dy, dx );
        }
        else
        {
            angle = aChaser.lastMoveAngle;
            gotIt = true;
        }

        return {
            gotIt: gotIt,
            distance: aMoveDistance,
            angle: angle
        };
    }

    function isOut( aCol, aRow ) {
        return aCol < 0 || iOptions.size.width <= aCol ||
               aRow < 0 || iOptions.size.height <= aRow;
    }

    function getMoveByWind( aScale )
    {
        var windStrength = iWind.getStrength();
        var windDirection = iWind.getDirection();
        var windMoveScale = aScale;
        return {
            dx: windMoveScale * windStrength * Math.cos( windDirection ),
            dy: windMoveScale * windStrength * Math.sin( windDirection )
        };
    }

    function getNearestVictim( aAnimal, aMaxDist, aVictimList )
    {
        if ( aAnimal.isLastNearestVictimStillClose( aMaxDist ) ) {
            return aAnimal.lastNearestVictim;
        }

        if ( !aAnimal.canSearchForVictim() ) {
            return null;
        }

        var candidates = aVictimList ?
                         findInList( aVictimList, aAnimal.cell, aMaxDist ) :
                         findEatableOnSoil( aAnimal.cell, aMaxDist );
        
        var result = null;
        if ( candidates.length ) {
            var index = Math.round( Math.random() * ( candidates.length - 1 ) );
            result = candidates[ index ];
            if ( aAnimal.isUnreachable( result.ID ) ) {
                result = null;
            }
        }

        return result;
    }

    function findEatableOnSoil( aCell, aMaxDist )
    {
        var result  = [];
        var colMin = Math.round( Math.max( aCell.col - aMaxDist, 0 ) ),
            colMax = Math.round( Math.min( aCell.col + aMaxDist, iOptions.size.width ) ),
            rowMin = Math.round( Math.max( aCell.row - aMaxDist, 0 ) ),
            rowMax = Math.round( Math.min( aCell.row + aMaxDist, iOptions.size.height ) );

        for (var col = colMin; col < colMax; ++col )
        {
            var fieldCol = iField[ col ];
            for (var row = rowMin; row < rowMax; ++row )
            {
                var cellPlants = fieldCol[ row ].plants;
                for ( var i = 0; i < cellPlants.length; ++i ) {
                    if ( cellPlants[ i ].isEatable() ) {
                        result.push( cellPlants[ i ] );
                    }
                }
            }
        }
        return result;
    }

    function findInList( aList, aCell, aMaxDist )
    {
        var result = [];
        var colMin = Math.round( Math.max( aCell.col - aMaxDist, 0 ) ),
            colMax = Math.round( Math.min( aCell.col + aMaxDist, iOptions.size.width ) ),
            rowMin = Math.round( Math.max( aCell.row - aMaxDist, 0 ) ),
            rowMax = Math.round( Math.min( aCell.row + aMaxDist, iOptions.size.height ) );

        for (var index = 0; index < aList.length; ++index )
        {
            var item = aList[ index ];
            var cell = item.cell;
            if ( colMin <= cell.col && cell.col <= colMax &&
                 rowMin <= cell.row && cell.row <= rowMax ) {
                result.push( item );
            }
        }

        return result;
    }

    function tryToSpreadInfection( aInfected, aCandidate )
    {
        for ( var infIndex = aInfected.length - 1; infIndex >= 0; infIndex -= 1 )
        {
            var infected = aInfected[ infIndex ];
            if ( infected === aCandidate ) {
                continue;
            }

            var infCell = infected.cell;
            if ( infCell.col === aCandidate.cell.col && infCell.row === aCandidate.cell.row ) {
                var desease = Math.random() < iOptions.infection.deseaseRate;
                if ( desease && !aCandidate.isInfected )
                {
                    aCandidate.isInfected = true;
                    aInfected.push( aCandidate );
                }
            }
        }
    }
    
    function getGenesStats( aList, aGenes )
    {
        var key;
        var stats = {};
        for ( key in aGenes ) {
            stats[ key ] = 0;
        }
        for ( var i = 0; i < aList.length; i += 1 )
        {
            var genes = aList === iPlants ? aList[ i ].genes.set : aList[ i ].getGenes();
            for ( key in genes )
            {
                var gene = genes[ key ];
                stats[ key ] += gene.value ? gene.value : gene;
            }
        }
        if ( aList.length )
        {
            for ( key in aGenes ) {
                stats[ key ] /= aList.length;
            }
        }
        return stats;
    }

    app.World = World;

})( MEW );