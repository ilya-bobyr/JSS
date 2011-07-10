"use strict;"

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


/*
 * This is modelled after the JSON interface, except that the output string,
 * while been valid JSON, will also carry some type information that may be used
 * to reconstruct the original user class instances in addition to the basic
 * ECMA Script data types.
 *
 * Class information is written using names of the constructors.  At the moment
 * the stringify() will check the global object for any properties that point to
 * Function objects that may be used as constructors and will use these property
 * names to refer to the relevant constructors.  If a relevant constructor can
 * not be found an exceptions will be thrown.  In the future it would make sense
 * to add a registration functionality for the constructors to enable for a more
 * elaborate use cases.
 *
 * parse() will look for constructors as properties of the global object using
 * the recorded names.
 *
 * JSS stand for JavaScript Serialization.
 */

JSS = {};

/*
 * stringify() will output a JSON representation of the value with some
 * additional information added.  The value will be wrapped into the following
 * object:
 * {
 *   "jss": 1,
 *   "v": value
 * }
 *
 * "jss" key value is a version of JSS used to do serialization.  "v" is the
 * actual value.
 *
 * stringify() will invoke JSON.stringify on the value, so if there is a
 * toJSON() method defined in the object prototype it will be used.
 *
 * If the value is an object who's prototype is not Number, String, Boolean,
 * Object or Array stringify() will try to find the object constructor among the
 * enumerable properties of the global object.  If unsuccessful an exception
 * will be thrown.  If successful the name of the property will be used to
 * encode the object type.
 *
 * stringify() may add type information to the objects been serialized.  When
 * serialization is done all the added properties are removed from the source
 * object and/or its subobjects.
 *
 * It is OK for toJSON() to return anything different from the original value.
 * stringify() will still use the constructor of the original object been
 * serialized.
 *
 * In version 1 the type name will be written as a value of a key named "$t",
 * unless the key is already present in the original object or the object
 * returned by toJSON().  In this case stringify() will find largest <n> such
 * that the property with name "$t<n>" is present on the object and will use
 * name "$t<n+1>" to store the type name.
 *
 * If a plain object is been serialized and it already has a property named "$t"
 * or "$t<n>" (n in {0, 1, ... }) stringify() will behave as if it would have a
 * type name of null.  This way parse() will not try to reconstruct this object
 * as a user class instance.  Otherwise plain object are not modified.
 *
 * space is an optional argument that has the same value as in JSON.stringify().
 */
JSS.stringify = function (value, space)
{
  var modifiedObjs = [];
  var allConstructors = JSS._getAllConstructors(JSS._global);

  function removeAddedProps()
  {
    for (var i = 0; i < modifiedObjs.length; ++i)
    {
      var { obj: obj, key: key } = modifiedObjs[i];

      delete obj[key];
    }

    modifiedObjs.length = 0;
  };

  function addTypeProperty(obj, typeName)
  {
    var key = JSS._getVacantTypeNameKey(obj);

    modifiedObjs.push({ obj: obj, key: key });
    obj[key] = typeName;
  };

  function wasAugmented(obj)
  {
    for (var i = 0; i < modifiedObjs.length; ++i)
      if (modifiedObjs[i].obj === obj)
        return true;
    return false;
  };

  /*
   * Returns a name of the global object property that holds a reference to a
   * constructor that has the same prototype object attached to it as the obj
   * prototype object.
   * If the obj is a plain object returns Object.prototype.
   * Otherwise returns undefined.
   */
  function getTypeName(obj)
  {
    switch (typeof obj)
    {
      case "undefined":
        return undefined;

      case "object":
        if (obj === null)
          return undefined;
        break;

      case "boolean":
        return undefined;

      case "number":
        return undefined;

      case "string":
        return undefined;

      case "function":
        return undefined;

      default:
        return undefined;
    }

    var prototype = Object.getPrototypeOf(obj);

    if (prototype === Object.prototype)
      return Object.prototype;

    if (prototype === Array.prototype)
      return undefined;

    var name = allConstructors.getNameByPrototype(prototype);

    if (name !== undefined)
      return name;

    throw new TypeError("JSS.stringify can not find a constructor"
      + " for an object: " + obj);
  };

  function replacer(key, value)
  {
    /* JSON.stringify() Str algorithm will provide the parent object as this. */
    var parent = this;

    var originalValue = parent[key];

    /*
     * There is a bug in Firefox < 5 that causes the replacer to be invoked
     * twice in some cases.  While this bug:
     *
     *   https://bugzilla.mozilla.org/show_bug.cgi?id=636079
     *
     * says that it may happen only in case the value is modified I see double
     * calls even for simple values that are not modified.
     * But it works fine with XulRunner 5.
     */
    if (!JSS._bug636079 || !wasAugmented(originalValue))
    {
      var typeName = getTypeName(originalValue);
      if (typeName !== undefined)
      {
        /*
         * As a special case getTypeName may return an Object.prototype instead
         * of a string to indicated a plain object.
         */
        if (typeName === Object.prototype)
        {
          if (JSS._hasTypeProperty(originalValue))
              /*
               * We need to be able to distinguish preexisting properties with
               * the name we use to note types on objects from our added
               * properties.  In order to do so we always add our property even
               * to plain objects if the already have a property with a name
               * that may later confuse parse().
               */
              addTypeProperty(value, null);
        }
        else
          addTypeProperty(value, typeName);
      }
    }

    return value;
  };

  var str = JSON.stringify({ jss: JSS._version, v : value },
                           replacer, space);

  removeAddedProps();

  return str;
};


/*
 * Does an opposite to what stringify() do.  Parses a string as if it would be a
 * JSON encoded representation of some value wrapped into the following:
 *
 * {
 *   "jss": 1,
 *   "v": value
 * }
 *
 * "jss" key value is a version of JSS used to do serialization.  "v" is the
 * actual value.
 *
 * parse() will invoke JSON.parse() on the text, so the parsing rules are the
 * same.  After parsing parse() will remove any additional information added by
 * stringify() including the wrapping object with version and any other
 * information.
 *
 * If stringify() serialized a user class instance parse() will try to
 * reconstruct it.  It will search through the global object enumerable
 * properties for one that has the same name as was recorded during
 * serialization under "$t" or "$t<n>".  parse() will set the object prototype
 * to be equal to the prototype associated with the constructor, though the
 * constructor will not be invoked.
 * If there is a property named "fromJSON" on the *constructor* (not the
 * prototype) and the property value has type "function", parse() will invoke
 * this function passing the reconstructed object (not connected to the
 * prototype) as the only argument and will use the result of the call as the
 * actual value.
 *
 * parse() will throw:
 *  - SyntaxErro() if the value is not property wrapped.
 *  - TypeError() if the version in the text is higher than the one that pasre()
 *    can deserialize.
 *  - TypeError() if the "fromJSON" is present on the constructor but is not a
 *    function.
 *  - TypeError() if an object (or a subobject) has a type name attached to it
 *    but parse() can not find a global object property with a matching name or
 *    does not have a prototype property.
 */
JSS.parse = function (text)
{
  var allConstructors = JSS._getAllConstructors(JSS._global);

  function reviver(name, val)
  {
    if (typeof val != "object")
      return val;

    var typePropName = JSS._getTypePropertyName(val);
    if (typePropName === undefined)
      return val;

    var typeName = val[typePropName];
    delete val[typePropName];

    if (typeName === null)
      /* An Object with type name like named properties. */
      return val;

    var e = allConstructors.getConstructorAndPrototypeByName(typeName);
    if (e === undefined)
      throw TypeError("JSON.parse can not find a constructor for type "
        + "'" + typeName + "'.");

    var { constructor: constructor, prototype: prototype } = e;

    var r = null;

    if (constructor.hasOwnProperty("fromJSON"))
    {
      var fromJSON = constructor.fromJSON;
      if (typeof fromJSON !== "function")
        throw TypeError("JSS.parse found a 'fromJSON' property for type "
          + "'" + typeName + "' but it is not a function.");

      r = fromJSON(val);
    }
    else
    {
      r = Object.create(prototype);
      for (var n in val)
        r[n] = val[n];
    }

    return r;
  };

  var obj = JSON.parse(text, reviver);

  /*
   * It seems unfortunate that the wrapper format and version check is done so
   * late, but even if moved into the reviver the algorithm used by JSON.parse()
   * will pass the wrapper to the reviver as the very last object.
   * For this version it does not seem to pose a problem, but if may be an issue
   * if reviver logic would have to depend on the archive version been
   * deserialized.
   */

  if (!(obj instanceof Object))
    throw SyntaxError("JSS.parse expectes the value to be wrapped.  "
      + "Got: " + text);

  if (typeof obj["jss"] !== "number")
    throw SyntaxError("JSS.parse expects a \"jss\" property with the version "
      + "number as the value in the wrapping object.  Got: " + text);

  if (obj.jss > JSS._version)
    throw TypeError("JSS.parse can not read archives with format version "
      + obj.jss + " maximum supported version is " + JSS._version);

  if (!obj.hasOwnProperty("v"))
    throw SyntaxError("Jss.prase expects a \"v\" property wit the actual value"
      + " in the wrapping object.  Got: " + text);

  return obj.v;
}

/*
 * === Implementation ===
 */
JSS._global = this;

JSS._version = 1;

JSS._typeNameKey = "$t";

JSS._typeNameKeyRe = /^\$t(\d*)$/;

/* Search for usage - there is a comment explaining what is this about. */
JSS._bug636079 = false;

JSS._AllConstructors = function()
{
  this.all = {};
}

JSS._AllConstructors.prototype =
{
  add: function (name, constructor, prototype)
  {
    this.all[name] = { constructor: constructor, prototype: prototype };
  },

  getNameByPrototype: function (prototype)
  {
    var all = this.all;
    for (var name in all)
    {
      var e = all[name];
      if (e.prototype === prototype)
        return name;
    }

    return undefined;
  },

  getConstructorAndPrototypeByName: function (name)
  {
    var all = this.all;
    if (name in all)
      return all[name];

    return undefined;
  }
};

JSS._getAllConstructors = function(global)
{
  var r = new JSS._AllConstructors();

  for (var n in global)
  {
    var func = global[n];

    if (typeof func != "function")
      continue;

    var prototype = func["prototype"];
    if (prototype === undefined)
      continue;

    r.add(n, func, prototype);
  }

  return r;
}

JSS._hasTypeProperty = function (obj)
{
  for (var n in obj)
    if (JSS._typeNameKeyRe.test(n))
      return true;

  return false;
}

JSS._getVacantTypeNameKey = function (obj)
{
  var maxN = JSS._getTypePropertyIndex(obj);

  var key = JSS._typeNameKey;

  if (maxN > -1)
    return key + (maxN + 1);

  if (maxN > -2)
    return key + "0";

  return key;
}

JSS._getTypePropertyName = function (obj)
{
  var maxN = JSS._getTypePropertyIndex(obj);

  var key = JSS._typeNameKey;

  if (maxN > -1)
    return key + maxN;

  if (maxN > -2)
    return key;

  return undefined;
}

/*
 * Search common to _getVacantTypeNameKey and _getTypePropertyName.
 */
JSS._getTypePropertyIndex = function (obj)
{
  var maxN = -2;
  var m;

  for (var n in obj)
  {
    if (m = JSS._typeNameKeyRe.exec(n))
    {
      var n = m[1] === "" ? -1 : +m[1];

      if (maxN < n)
        maxN = n;
    }
  }

  return maxN;
}

/* vim: set et sts=2 sw=2 tw=80 spell spl=en: */
