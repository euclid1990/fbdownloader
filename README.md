# Facebook Downloader

Download all your facebook posts/photos/videos and save it into local disk

![](./images/demo.gif)

## Prerequisite

You have to create new Facebook app.
[Guideline · Registering an application with Facebook](./FACEBOOK.md)

## Installation

- You need Node.js v6 or higher to run this program. See [Installing Node.js via package manager](https://nodejs.org/en/download/package-manager/).

- Clone project and install dependencies
```terminal
$ git clone git@github.com:euclid1990/fbdownloader.git
$ cd fbdownloader
$ npm install
```

## Usage

Run program
```terminal
$ node app
```

### Configuration Facebook app

- Choose `❯ Initialize` to config `.env` file.

Please enter information of Facebook app (`App ID, App Secret`)

### Re-authenticate Facebook app

- Choose `❯ Authenticate` to exchange new facebook access token.

If you get an error when trying download data from Facebook such as `Error validating access token: Session has expired on ...`. This functions can help you avoid those kinds of bugs.

### Download Post

- Choose `❯ Download Post` to save all posts text to folder 'downloads/posts' on disk.

### Download Photo

- Choose `❯ Download Photo` to save all photos to folder 'downloads/photoss' on disk.

### Download Video

- Choose `❯ Download Video` to save all videos to folder 'downloads/videos' on disk.

### Quit

- Choose `❯ Quit` to quit program. If it doesn't terminate, hit `CTRL + C` to kill.
