/*
 * Copyright (c) 2011, Ilya Bobyr <ilya.bobir@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  o Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 *  o Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */


load("jss.js");


var equiv = (function ()
{
  this.window = {};
  load("equiv.js");
  var equiv = window.equiv;
  delete this.window;
  return equiv;
})();

var unitTests = [];


function simpleStringifyTest(obj, space, expectedText)
{
  var text = JSS.stringify(obj, space);

  if (text != expectedText)
  {
    var err = new Error();
    err.got = text;
    err.expected = expectedText;
    throw err;
  }
}

function simpleParseTest(text, expectedObj)
{
  var obj = JSS.parse(text);

  testEqual(obj, expectedObj);
}

function userClassParseText(text, expectedObj, expectedPrototype)
{
  var obj = JSS.parse(text);

  testEqual(obj, expectedObj);
  testEqual(Object.getPrototypeOf(obj), expectedPrototype,
    "Prototypes do not match");
}

function testEqual(obj, expected, msg)
{
  if (!equiv(obj, expected))
  {
    var err = new Error();
    if (msg)
      err.message = msg;
    err.got = obj;
    err.expected = expected;
    throw err;
  }
}


/* == User classes == */

function UserClassA(i)
{
  this._i = i;
}

UserClassA.prototype =
{
  g: function ()
  {
    return this._i + 10;
  }
};


function UserClassADerived(j)
{
  this._j = j;
  this._i = j + 10;
}

UserClassADerived.prototype = Object.create(UserClassA.prototype,
{
  h:
  {
    value: function ()
    {
      return this._j;
    },
    enumerable: true,
    writable: true
  },

  type: {
    value: "UserClassADerived",
    enumerable: true,
  },
});


function UserClassB(i)
{
  this._i = i + 5;
}

UserClassB.fromJSON = function (val)
{
  var r = new UserClassB(val.i);
  return r;
}

UserClassB.prototype =
{
  g: function ()
  {
    return this._i + 7;
  },

  toJSON: function ( /* key */ )
  {
    return { i: this._i - 5 };
  },
};


function UserClassC(j)
{
  this._j = j;
  this.$t = "UserClassADerived";
}

UserClassC.prototype = {};


function UserClassC1(j)
{
  this._j = j;
  this.$t0 = "UserClassA";
}

UserClassC1.prototype = {};


function UserClassC2(j)
{
  this._j = j;
  this.$t = "UserClassB";
  this.$t1 = "UserClassA";
}

UserClassC2.prototype = {};


/* == Stringify tests == */

function unitTest_s_1()
{
  var obj = 7;

  simpleStringifyTest(obj, null, '{"jss":1,"v":7}');
}
unitTest_s_1.title = "Stringify.  Number";
unitTests.push(unitTest_s_1);


function unitTest_s_2()
{
  var obj = {
    a: 10,
    b: [ 20, 21, 22 ]
  };

  simpleStringifyTest(obj, null, '{"jss":1,"v":{"a":10,"b":[20,21,22]}}');
}
unitTest_s_2.title = "Stringify.  Basic object";
unitTests.push(unitTest_s_2);


function unitTest_s_3()
{
  var obj = {
    a: 10,
    b: 20
  };

  simpleStringifyTest(obj, null, '{"jss":1,"v":{"a":10,"b":20}}');
  testEqual(obj, { a: 10, b: 20 });
}
unitTest_s_3.title = "Stringify.  No added properties";
unitTests.push(unitTest_s_3);


function unitTest_s_4()
{
  var obj = new UserClassA(10);

  simpleStringifyTest(obj, null, '{"jss":1,"v":{"_i":10,"$t":"UserClassA"}}');
}
unitTest_s_4.title = "Stringify.  Basic user class";
unitTests.push(unitTest_s_4);


function unitTest_s_5()
{
  var obj = new UserClassB(10);

  simpleStringifyTest(obj, null, '{"jss":1,"v":{"i":10,"$t":"UserClassB"}}');
}
unitTest_s_5.title = "Stringify.  Basic user class with serialization support";
unitTests.push(unitTest_s_5);
 
 
function unitTest_s_6()
{
  var obj = new UserClassC(11);

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"_j":11,"$t":"UserClassADerived","$t0":"UserClassC"}}');
}
unitTest_s_6.title = "Stringify.  Basic user class with '$t'";
unitTests.push(unitTest_s_6);
 
 
function unitTest_s_7()
{
  var obj = new UserClassC1(9);

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"_j":9,"$t0":"UserClassA","$t1":"UserClassC1"}}');
}
unitTest_s_7.title = "Stringify.  Basic user class with '$t0'";
unitTests.push(unitTest_s_7);


function unitTest_s_8()
{
  var obj = new UserClassC2(8);

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"_j":8,"$t":"UserClassB",'
    + '"$t1":"UserClassA","$t2":"UserClassC2"}}');
}
unitTest_s_8.title = "Stringify.  Basic user class with '$t' and '$t1'";
unitTests.push(unitTest_s_8);


function unitTest_s_9()
{
  var obj = new UserClassADerived(12);

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"_j":12,"_i":22,"$t":"UserClassADerived"}}');
}
unitTest_s_9.title = "Stringify.  Basic derived class";
unitTests.push(unitTest_s_9);


function unitTest_s_10()
{
  var obj = { k: 3, "$t": "test" };

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"k":3,"$t":"test","$t0":null}}');
}
unitTest_s_10.title = "Stringify.  An Object with '$t'";
unitTests.push(unitTest_s_10);


function unitTest_s_11()
{
  var obj = { k: 3, "$t": "test2", "$t1": "UserClassA" };

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"k":3,"$t":"test2","$t1":"UserClassA","$t2":null}}');
}
unitTest_s_11.title = "Stringify.  An Object with '$t' and '$t1'";
unitTests.push(unitTest_s_11);


function unitTest_s_12()
{
  var obj = { m: 4, "$t4": "test3", "$t6": "UserClassB" };

  simpleStringifyTest(obj, null,
    '{"jss":1,"v":{"m":4,"$t4":"test3","$t6":"UserClassB","$t7":null}}');
}
unitTest_s_12.title = "Stringify.  An Object with '$t4' and '$t6'";
unitTests.push(unitTest_s_12);


/* == Parse tests == */

function unitTest_p_1()
{
  var text = '{"jss":1,"v":10}';

  simpleParseTest(text, 10);
}
unitTest_p_1.title = "Parse.  Number";
unitTests.push(unitTest_p_1);


function unitTest_p_2()
{
  var text = '{"jss":1,"v":{"a":10,"b":[20,21,22]}}';

  simpleParseTest(text,
    {
      a: 10,
      b: [ 20, 21, 22 ]
    });
}
unitTest_p_2.title = "Parse.  Basic object";
unitTests.push(unitTest_p_2);


function unitTest_p_3()
{
  var text = '{"jss":1,"v":{"_i":10,"$t":"UserClassA"}}';

  userClassParseText(text,
    new UserClassA(10),
    UserClassA.prototype);
}
unitTest_p_3.title = "Parse.  Basic user class";
unitTests.push(unitTest_p_3);


function unitTest_p_4()
{
  var text = '{"jss":1,"v":{"i":10,"$t":"UserClassB"}}';

  userClassParseText(text,
    new UserClassB(10),
    UserClassB.prototype);
}
unitTest_p_4.title = "Parse.  Basic user class with serialization support";
unitTests.push(unitTest_p_4);


function unitTest_p_5()
{
  var text =
    '{"jss":1,"v":{"_j":11,"$t":"UserClassADerived","$t0":"UserClassC"}}';

  userClassParseText(text,
    new UserClassC(11),
    UserClassC.prototype);
}
unitTest_p_5.title = "Parse.  Basic user class with '$t'";
unitTests.push(unitTest_p_5);


function unitTest_p_6()
{
  var text =
    '{"jss":1,"v":{"_j":9,"$t0":"UserClassA","$t1":"UserClassC1"}}';

  userClassParseText(text,
    new UserClassC1(9),
    UserClassC1.prototype);
}
unitTest_p_6.title = "Parse.  Basic user class with '$t0'";
unitTests.push(unitTest_p_6);


function unitTest_p_7()
{
  var text =
    '{"jss":1,"v":{"_j":8,"$t":"UserClassB",'
    + '"$t1":"UserClassA","$t2":"UserClassC2"}}';

  userClassParseText(text,
    new UserClassC2(8),
    UserClassC2.prototype);
}
unitTest_p_7.title = "Parse.  Basic user class with '$t' and '$t1'";
unitTests.push(unitTest_p_7);


function unitTest_p_8()
{
  var text =
    '{"jss":1,"v":{"_j":12,"_i":22,"$t":"UserClassADerived"}}';

  userClassParseText(text,
    new UserClassADerived(12),
    UserClassADerived.prototype);
}
unitTest_p_8.title = "Parse.  Basic derived class";
unitTests.push(unitTest_p_8);


function unitTest_p_9()
{
  var text =
    '{"jss":1,"v":{"k":3,"$t":"test","$t0":null}}';

  userClassParseText(text,
    { k: 3, "$t": "test" },
    Object.prototype);
}
unitTest_p_9.title = "Parse.  An Object with '$t'";
unitTests.push(unitTest_p_9);


function unitTest_p_10()
{
  var text =
    '{"jss":1,"v":{"k":3,"$t":"test2","$t1":"UserClassA","$t2":null}}';

  userClassParseText(text,
    { k: 3, "$t": "test2", "$t1": "UserClassA" },
    Object.prototype);
}
unitTest_p_10.title = "Parse.  An Object with '$t' and '$t1'";
unitTests.push(unitTest_p_10);


function unitTest_p_11()
{
  var text =
    '{"jss":1,"v":{"m":4,"$t4":"test3","$t6":"UserClassB","$t7":null}}';

  userClassParseText(text,
    { m: 4, "$t4": "test3", "$t6": "UserClassB" },
    Object.prototype);
}
unitTest_p_11.title = "Parse.  An Object with '$t4' and '$t6'";
unitTests.push(unitTest_p_11);


(function ()
{

  print("Unit tests:");
  for (var i = 0; i < unitTests.length; ++i)
  {
    var failed = true;
    var msg, got, expected;
    try
    {
      unitTests[i]();
      failed = false;
    }
    catch (e)
    {
      msg = e.message;
      got = e.got;
      expected = e.expected;
  
      if (!msg && !got && ! expected)
        msg = JSON.stringify(e);
    }
  
    print(i + ". " + unitTests[i].title + " : " + (!failed ? "OK" : "fail"));
  
    function out(prefix, obj)
    {
      if (!obj)
        return;
      if (typeof obj == "string" || obj instanceof String)
        print(prefix + obj);
      else
        print(prefix + JSON.stringify(obj, null, 2));
    }
  
    if (failed)
    {
      out("  ", msg);
      out("Got:      ", got);
      out("Expected: ", expected);
    }
  }

})();

/* vim: set et sts=2 sw=2 tw=80 spell spl=en: */
