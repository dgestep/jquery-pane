DEMO

The jquery-pane-app.zip file contains an Eclipse project which contains the
web project displayed at (http://dougestep.com/pane/jquery-pane-demo).  This is
a Java project using an Apache Tomcat 7 server.  You should be able to import
it directly into Eclipse using the File --> Import 
--> Existing Project into Workspace option.  Choose Select Archive File and browse to
the jquery-pane-app.zip.  After you import it in, you may have to change
the location of the Tomcat binaries to match your system location.

Once imported in, create a server using the Servers tab and add the jquery-pane-app
to the server.  Start the server and navigate to 
http://localhost:8080/pane/jquery-pane-demo.  (This URL assumes your
local host is called "localhost" and that it's running on port 8080).