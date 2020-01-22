> This application was made as a part of a course about restful api development in 2019. It received a gold star.
The server has since been taken down.

# Instructions

## URL to API
The API can be found at https://api.tinfoil-academy.me

## Postman Collection
You can find the Postman collection in the repo. I tried to include as many requests as I could think of, but I imagine that I most likely forgot about something. I was also unable to completely cover all forms of **error handling**. I included several different requests that would, by default, trigger errors but they do in no way cover all possible scenarios involving errors. If you wish, it should be easy to mess around with input to see how the API responds.

## Postman Environment
You need to use a postman environment in order to use tokens. The environments file has been included in the repo. You can also make your own, as long as the key "jwt" is free.

## Testing
I was running very short on time towards the end and did not have time to test certain features properly, such as the ability to update a report. It should all be pretty functional but you never know where the bugs may be lurking. I also noticed that an actual error message (unsafe) managed to sneak past and be presented to the user. I am aware of this issue and will look into it if I have the time.

## Authentication
My API uses JWT with a route (/token) to assign a JWT to the user that requests it (through a POST with username and password). They last 1 hour by default. It is likely that the JWT included in Postman has expired by the time you get to it. You can choose either "Request Token (examiner)" or "Request Token (admin)" to get a new token. The token that you get will be saved to the local environment as "jwt" and can then be used in any subsequent requests. You can freely request tokens back and forth between examiner, admin, and whatever account that you make by using those requests. You can also use "Who Am I" to see which JWT you are currently using.

# Questions
## Explain and defend your implementation of HATEOAS in your solution.
Okay, first of all I have to say that (I did not, admittedly, think much about this when I chose this application) the API that I made is a bit "unfit" for this requirement. It is not something that is "intended" for a user to browse, but I had to make do with what I had. I personally do not like the idea of HATEOAS as it adds a bunch of bloat in the sense of information that is somewhat unlikely that anyone will use. That said, I originally wanted to include only _logical follow-ups_ as links, but the more I read the requirements and followed discussions on Slack, it seems like you simply want us to slap a bunch of links on top of our responses. This goes against my wish to keep responses as clean as possible without any envelopes unless absolutely necessary (also see [this article](https://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api) on the matter).

That said, I had no choice than to pollute my responses with links and thus I had to wrap each response in an envelope like so:  

> {  
> &nbsp;&nbsp;&nbsp;**data**: The actual data of the response goes here. Could be a simple string, an array of data, or whatever.  
> &nbsp;&nbsp;&nbsp;**links**: Since you are supposed to be able to "browse" my API, this array contains a link to itself (rel: self), as well as a link to each and every feature offered by the API. This includes roughly nine links to various endpoints with appropriate methods and rels provided.  
> }

Each link is structed as follows:
> {  
> &nbsp;&nbsp;&nbsp;**rel**: a string describing the relationship, such as "self" or "home"  
> &nbsp;&nbsp;&nbsp;**href**: a link to the relevant resource. If the resource has an Id (that is generic and not specific for the current resource), it is indicated by {id}. This means that the user can optionally specify an Id.  
> &nbsp;&nbsp;&nbsp;**method**: the intended method that the user should use.  
> }  

Additionally, each and every item in **data** is assigned its own "links" by the API. This is an array containing links to relevant actions that can be taken on the resource. An example would be a _report_ with the Id 1:

> [{  
> &nbsp;&nbsp;&nbsp;**rel**: "self"  
> &nbsp;&nbsp;&nbsp;**href**: "/reports/1"  
> &nbsp;&nbsp;&nbsp;**method**: "GET"  
> }, {  
> &nbsp;&nbsp;&nbsp;**rel**: "update"  
> &nbsp;&nbsp;&nbsp;**href**: "/reports/1"  
> &nbsp;&nbsp;&nbsp;**method**: "PATCH"  
> }, {  
> &nbsp;&nbsp;&nbsp;**rel**: "delete"  
> &nbsp;&nbsp;&nbsp;**href**: "/reports/1"  
> &nbsp;&nbsp;&nbsp;**method**: "DELETE"  
> }]  

Responses to POST, PATCH (PUT has been omitted as PATCH covers the usage area of PUT. Bad practise but time is running short.), and DELETE function similarly to GET - with the exception that **data** might be empty or simply contain "success" or a similar message. This means that for things like DELETE and PATCH, there will be a "body" of the response which is why I return a 200, and not a 204 (even if that is the "default"). Responses to resources being created with POST will include a link to the created resource in its Location-header, as specified by the standard. The link is not included in the response body. This means that no matter where you are in the API, or what you are doing, you will always have a set of links that can get you on your way. The only exception is when the user encounters an error. An error message does not include any links other than a link to itself (as in the resource that raised the error in question). An error response looks like this:

>   **code**: the relevant HTTP status code  
>   **message**: a message describing the issue (more or less descriptive depending on the error)  
>   **links**: [{  
> &nbsp;&nbsp;&nbsp;**rel**: "self"  
> &nbsp;&nbsp;&nbsp;**href**: the resource that raised the error.  
> &nbsp;&nbsp;&nbsp;**method**: the method used.  
>   }]  

To show how this linking would work, here is a hypothetical usage scenario for deleting a _report_:
1. Navigate to Home. Presented with links to resources.
2. Follow a link to reports, replacing the placeholder {id} with the relevant report id.
3. The report is shown with links to its relevant actions.
4. Follow the link given by the link with rel: "delete", using the given method.
5. Mission Accomplished. You can now follow a link back home, or wherever else you wish to go.

This is, to my understanding a rather standard implementation of HATEOAS. It does have its issues, though. As an example, it does not specify what needs to be provided in a POST or a PATCH. Nor does it make any hints of what sort of authentication is used. Or any supported query parameters (in this API, reports are paginated through "lastReportId" + X additional reports, the variable is collected through a query parameter). It is difficult for me to defend this as I do not like it and I feel dirty for making it, but I do believe that users are given sufficient information (in the form of links, methods, etc.) to navigate my API without having to read any extensive API documentation. The ability to use an API without having to read the documentation also seems to be the whole point of HATEOAS in the first place, too.

I should point out that due to how I designed this API, HATEOAS is not "great". Which you have probably noticed by now. One of the things that always bothered me when using other APIs is when I ask the API for something, such as a user, and instead of getting the user information, I get some kind of skeleton object with nine different Ids or links to where I can manually piece the user object together myself. I realize that this saves server resources (except that the client will now have to send ten requests instead of one which might be good considering HTTP2) but I find it very user-unfriendly. Because of this, I designed this API similarly to how _Patreon_ designed theirs. If you ask for a user, you get all of the user information, and you can even optionally include additional information and have their API build it for you. In my API, you get Object-oriented responses, which means that a _Report_, as an example, does not just give you an Id of its owner/creator, it includes the actual owner in its representation, just like it does in OO code. This makes links such as "rel: owner, href: users/ownerId" etc. completely pointless as the information is already there. Compare below:

**Only Ids**
> {  
> &nbsp;&nbsp;&nbsp;reportId: 2,  
> &nbsp;&nbsp;&nbsp;ownerId: "KalleAnka",  
> &nbsp;&nbsp;&nbsp;links: [{  
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;rel: "owner",  
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;href: "/users/KalleAnka",  
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;method: "GET" }]  
> }  

**My API would return this**
> {  
> &nbsp;&nbsp;&nbsp;reportId: 2,  
> &nbsp;&nbsp;&nbsp;ownerId: "KalleAnka",  
> &nbsp;&nbsp;&nbsp;owner: {  
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;username: "KalleAnka",  
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;region: "EU" }  
> }  

However, this does not help users who want to, for instance, delete the owner of the report (you are not supposed to be able to do this anyway, though) or update it. Because of this, I still had to include links in these situations. This is unfortunate but it still means that the user is given the option to follow the link if they need to, but I still do not force them to do so. Either way, I personally find this vastly superior in the user-friendliness department, especially as I am not forcing them to make 800 requests just for one single thing. I realize that performance issues could arise (it is also possible that the user does not want _all_ the information in the first place. I had wanted to add support for custom "fields" like _Patreon_ also does support, but no time...), especially in larger applications (this one is quite small), but this is a bridge that I will cross once I get to it. That said, you may have preferred option one for all I know but at least now you know my reasoning.

## If your solution should implement multiple representations of the resources. How would you do it?
My model classes have a function called "jsonify()" which converts it into a clean, JSON-friendly object (it is not called "toJSON" as it does not call JSON.stringify itself). Had I wanted alternative representations, such as xml, I would have added functions to my model classes, such as "xmlify()", and then call the appropriate function on each model class based on the request's content-type. I feel this is rather straight-forward as each object is responsible for finding the most appropriate way of representing itself (using a common transcription engine, perhaps?), albeit somewhat MVC-violating. 

## Motivate and defend your authentication solution.
I use simple JSON Web Tokens with my own implementation of both signing and verification. After figuring out how it works, I realized that it is a very convenient way of doing stateless authentication especially due to its ability of carrying additional data. This way, any user can send a POST to "/tokens" with their user information and get a JSON Web Token valid for a few hours containing relevant information (only their username and whether or not they are an admin). After this period it will be rejected. It is also rejected upon signature verification failure or if the username is not on record (i.e. the audience is no longer present). While it is valid, it can be used to access restricted functionality and resources, such as taking ownership of a report that you create (if the jwt username matches the resource owner then they have access. Admins can also bypass this check). Its simplicity and cleanliness were the main motivating factors here, and that the assignment made JWT seem mandatory probably had a hand it in as well.

### What other authentication solutions could you implement?
There are many other potential solutions, some good, some bad, some quite ugly. If I was magnificently lazy I could use basic HTTP authentication and basically not care at all about making any form of proper authentication. It also lacks any form of encryption which is not exactly a point in its favour (even if it might not be that big of a deal since I use HTTPS). Could have been implemented quite easily, though. Roughly the same goes for its bigger brother Digest Authentication.

I do use token authentication myself, in the form of JWT, but those are considered "token by value" (as in, they carry information). They have a little brother which is also a token, although those are by reference which means it is more or less just a random string that is tied to a user, most likely, and serve as an access token. API keys, which I personally very much like, is an example of an access token. This would have been quite easy to implement (as it is essentially just a lite version of JWT) but they are not particularly secure as they do not necessarily enforce expiration times and have a tendency to wander off and fall into the wrong people's hands.

Would not necessarily matter for this application as it does not rely on any other services, and it is not necessarily intended to be used as authentication anyway, but a framework such as OAuth2 could be used to allow users to log in with their Google or Github account, etc. This would roughly be the same as using token authentication, but the other way around. Instead of giving some form of token to the user that they then use to access our service, the user delegates some form of token to us that we then use to verify that they have access to their third-party account and if they do then they also have access to their account in our service. It works but is kind of ugly.

### What pros/cons do this solution have?
Are we talking about JWT here? Not sure that I understand the question. Anyway, I am going to assume that we are talking about JWT solutions in general as mine is not different in any way, really. JWTs are very convenient, self-contained authentication solutions. They are able to be freely distributed to users (as they are not uniquely tied down in a 1:1 relationship to a user like access tokens are) and carry an arbitrary amount of custom data (as well as various additional information such as _issuer_ and similar "standard" info) that, while accessible to anyone who knows what base64 encoding is, is protected from any form of manipulation. This makes it ideal for carrying non-sensitive information such as an identifying username, whether the user satisfies a certain condition (such as admin), and so on. This would then allow the server to basically blindly trust the JWT as it cannot be modified and therefore must be true. They also support an easy method of tracking token expiration which adds a layer of security to an otherwise perpetual authorization. Downsides are, obviously, that a JWT without an expiration time can be used in perpetuity which is a big security risk. It should not be used to transfer sensitive information as it is public. Then there is also the, at least theoretical, possibility of token forgery or that the secret used for signature creation is leaked. This could, and most likely would, prove catastrophic.

## Explain how your webhook works.
I had trouble figuring out what the webhook should do for my assignment so I eventually had to settle for a... somewhat uninteresting solution. That said, a user can, using a valid token, make a POST to /hooks and create a webhook for an event of their choice. Currently, there is only one event, "reportCreated" which is exactly what it sounds like. Whenever a new Report is created, it gets sent, through POST, to all addresses specified by subscribing webhooks. A user can optionally specify a secret that my API will use to create a signature of the request (included as "signature" in the body) that the user can then use to verify that it is a legitimate hook from my API. That is about it, really. I do not know how to show this othern than saying that you will have to register a webhook of your own and see what happens. I wanted to implement a feature similar to Github where you can track successful/unsuccessful webhook posts (the webhook post to X was unsuccessful, etc.) but I did unfortunately not have time to do this.

## Since this is your first own web API there are probably things you would solve in an other way looking back at this assignment. Write your down thoughts about this.
Oh, there is most likely quite a lot that I cannot remember off the top of my head. One of the main things is that I am not so sure about my decision to use my "OO-based" responses as I discussed above. Because of HTTP2, it might actually have been better to omit those additional objects and simply provide HATEOAS links that the client can use to fetch those resources. I do admittedly love OO a bit too much and sadly Web Development seems to play by its own rules quite a lot of the time.

I should have spent more time thinking about query parameters and ways for users to choose what they want to see. As I said above, I doubt my solution of including everything but an even better solution would have been to include HATEOAS links to the resources, but then if the users specify that they would like to have the additional information as well (such as by using ?include=X,Y,Z) _then_ I would also send it.

I should probably have used a library for JWT signing and authentication. It would have a) saved me a lot of time and b) given me experience with libraries that are probably very relevant when getting a job later on. I also feel that I am a bit overzealous about my verifications of certain things. Technically, I feel that a stringified JSON object could classify as "text" content type, even if I am not sure if others would agree. Either way I decided to accept Accept-headers saying application/json and text/html. This is manily because the browser sends text/html and I want to let people access it through their browser.

I should probably have thought a bit more about my HATEOAS implementation. I believe it makes sense, but it feels very ugly and a bit redundant. Like John said in a lecture, just throwing everything in there (aka Github) makes you feel like you have lost the thread, but at the same time you need that to properly "browse" the API. The fat chunk of links serves as a navigation bar would on a normal webpage. I do not know. HATEOAS is deceptively complicated.

I feel that I violated quite a few design principles. There is a fair bit of string dependencies and other shortcuts that could have, without a doubt, be solved with more grace. I started off quite well with dependency injecting _PersistenceDAO_ and letting _APIController_ deal with... well, controlling stuff. The issue is that most of my error messages are hardcoded in the controller, which is not pretty, amongst other things. I tried to move as much as I could into the router but I was not able to (given the timeframe) make the controller "unaware" of being a web application.

## Did you do something extra besides the fundamental requirements? Explain them.
Since my API is not the "default" one I find it difficult to list extras... there are a few things that I have invested extra time into (since this application was made to be used by a gaming community I focused on things I felt that they would find useful):
1. Input validation through the use of "OO models"
2. Ability to apply filters (many endpoints support query parameters for filtering results)
   - examples include ?owner=report_owner, ?lastReportId=id_of_last_report_you_saw, ?spot=spot_you_want_to_see etc.
3. Similar to filters, I added report pagination in the form of limiting each response to 20 items. You can then take the id of the last report that you got and supply it as _lastReportId_ and then you get another 20 items, starting at the provided id. This allows you to paginate your way through all reports without overloading yourself or the server (this is the same way that _Discord_'s api handles messages).
4. Security (probably nothing out of the ordinary, but I have actively considered this)
   - I wanted to use rate limits on a token basis, but did not have time to do that. I just use a library for managing this right now.
   - I also made my own JWT solution. I don't know if that is a plus but I figured it was a good thing to learn.
5. One of the main ideas of this API was that you would be able to ask "questions" as in "if I play class X and I go to spot Y for Z minutes, what can I expect to get in terms of loot?". I did not have time to make this as complex as I had wanted to, but I believe it would be considered an extra. You can find this "feature" at /statistics
6. My API includes, what I think is, a lot more features than the "suggested application", but most of them are essentially just the same thing but repeated with somewhat different values.

# Simple Assignment Checklist
1. The API should at least support representations with application/json
   - CHECK. the API supports only application/json as of now.
2. The API should try to follow the constraints for Restful APIs
   1. **Client–server architecture**: this is a given. The API is completely detached from whatever interface/client one may choose to use.
   2. **Statelessness** : the API is fully stateless, embracing no forms of sessions and only serves users through tokens.
   3. **Cacheability**: the API will inform the client of whether the result can be safely cached or not, and for how long, when applicable. The API also does some caching internally to reduce processing times. Generally, dynamic content that can change at any time (reports, users, etc.) are not to be cached. Static content such as grindspots and loot (that will never change) can be cached for 3+ months (just in case).
   4. **Layered System**: this holds true. nGinx and stuff.
   5. **Code on demand**: not applicable.
   6. **Uniform Interface**:
    - "Identification of resources": yes.
    - "Resource manipulation through representations": yes. Absolutely.
    - "Self-descriptive messages": yes. The API includes "application/json" as the appropriate Content-Type of the response.
    - "Hypermedia as the engine of application state (HATEOAS)": yes. See above.
3. The API should embrace the idea of HATEOAS. The API should have one entry point and use HATEOAS for making the API browsable.
   - CHECK.
4. The API should give the client possibilities to create, read, update and delete resources.
   - CHECK. there are resources that can be created, read, updated, and deleted. Not all resources can, however. There is also no support for PUT, but PATCH is supported.
5. Unsafe HTTP methods and data about users in the system should require authentication done through the API with implementation of JWT-tokens.
   - CHECK. JWT authentication is enforced for sensitive functionality.
6. The API should give some ability to register a web hook which will trigger on some, of you chosen, event.
   - CHECK. a user can register a webhook for when a new report is created and have it delivered, through a POST, to an address of their choosing.
7. In your examination repository you should provide a POSTMAN collection. The examiner should be able to load this into the POSTMAN application or a NEWMAN CLI and test your API without any further configuration.
   - Don´t forget to make calls that shows your error handling like bad requests, bad credentials and so on.
   - CHECK.
8. The code should be published in your examination repository along with a report
   - CHECK.
9. Your solution should be testable without any configuration, installations of servers and so on. Preferable will the API be testable through a public URL. Any instructions of how to test your solution should be in your repository README.
   - CHECK.
10. The code should be individual created, the examiners may run a code anti-plagiarism tool on your code. Plagiarism will be reported.
    - CHECK.
11. Make a script-file that automatically populated your application with some data for testing
    - CHECK. (not needed as the application already has data)
