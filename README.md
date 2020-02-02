[![npm version](https://badge.fury.io/js/check-es-compat.svg)](https://badge.fury.io/js/flickr-files-renamer)

# flickr-files-renamer

> CLI tool for renaming original photo files based on their Flickr name

## Why

1. You took some photos and uploaded them to Flickr
1. You named them on Flickr
1. You kept the original files, with the names your camera gave them
1. You now want to give those files the names from Flickr

## Usage

You'll need a [Flickr API key](https://www.flickr.com/services/api/misc.api_keys.html). For usage information, run:

```bash
$ npx flickr-files-renamer --help
```

It would be wise to make a copy of the original photos before running this tool.

## How it works

It matches photos by their "date taken", from the files' EXIF data and the same data exposed by the Flickr API.

## Limitations

User authentication is not implemented, so it only works on public sets.
