# JavaScript Serialization

A layer on top of JSON that stores type information allowing store and retrival
of user class instances.

For example:

```javascript
    function UserClass(i)
    {
      this._i = i;
    }

    UserClass.prototype =
    {
      f: function()
      {
        return this._i + 5;
      }
    };

    var a = new UserClass(10);

    print("a.f(): " + a.f()); // "a.f(): 15"

    var text = JSS.stringify(a);

    var b = JSS.parse(text);

    print("b.f(): " + b.f()); // "b.f(): 15"
```


There are still a lot that may be added, but the basics seems to be here :)

Tested on Firefox {4,5}.

On Firefox 4 you would want to set JSS._bug636079 to true.
I am running this under JavaScript-C, that is a stripped down XULRunner.  Not
sure how to get the runtime version infromation =)  Suggestions welcome.
