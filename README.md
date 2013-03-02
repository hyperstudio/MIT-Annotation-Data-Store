Running a custom/latest Node[.js] version on RedHat's OpenShift PaaS
====================================================================
This git repository is a sample Node application along with the
"orchestration" bits to help you run the latest or a custom version
of Node on RedHat's OpenShift PaaS.


Selecting a Node version to install/use
---------------------------------------

To select the version of Node.js that you want to run, 
update the 'engines' section of your app's package.json file.

    Example: To install Node.js version 0.8.21, update your package.json file:
       $ sed -e 's/"node": ".*"/"node": ">= 0.8.21"/' -i package.json


The action_hooks in this app will automatically download, build,
and install a copy of Node.js that matches the requirements specified in
your app's package.json file.

     See: .openshift/action_hooks/ for more informaiton.

Okay, now onto how can you get a custom Node.js version running
on OpenShift.


Steps to get a custom Node.js version running on OpenShift
----------------------------------------------------------

Create an account at http://openshift.redhat.com/

Create a namespace, if you haven't already do so

    rhc domain create <yournamespace>

Create a nodejs-0.6 application (you can name it anything via -a)

    rhc app create -a palinode  -t nodejs-0.6

Add this `github nodejs-custom-version-openshift` repository

    cd palinode
    git remote add upstream -m master git://github.com/openshift/nodejs-custom-version-openshift.git
    git pull -s recursive -X theirs upstream master

If you would like to use a more recent version of Node.js (example v0.9.1), just update the 'engines' section of your app's package.json file:

    sed -e 's/"node": ".*"/"node": ">= 0.8.21"/' -i package.json

Commit your changes locally:

    git add package.json
    git commit -m 'updating package.json to select Node.js version 0.8.21'

Then push your updates to OpenShift

    git push

That's it, you can now checkout your application at:

    http://palinode-$yournamespace.rhcloud.com
    ( See env @ http://palinode-$yournamespace.rhcloud.com/env )

