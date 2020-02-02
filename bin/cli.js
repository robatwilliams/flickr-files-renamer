#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');

const program = require('commander');
const { ExifImage } = require('exif');
const fetch = require('node-fetch');

program
  .requiredOption('-k, --api-key <key>', 'Flickr API key')
  .requiredOption('-u, --username <username>', 'Flickr username')
  .requiredOption('-s, --set-id <set-id>', 'Set (album) id - grab it from the URL')
  .requiredOption('-o, --originals-dir <path>', 'Path to folder containing originals')
  .option('--dry-run', 'Dry run; do not carry out the renames');

program.parse(process.argv);

(async () => {
  const onFlickr = await getFlickrPhotos();
  const originals = await getOriginalFiles();

  if (onFlickr.length !== originals.length) {
    console.warn(
      `Number on Flickr (${onFlickr.length}) doesn't match number of originals (${originals.length}). Maybe some aren't public?`
    );
  }

  const { matches, noMatch } = matchPhotos(originals, onFlickr);

  if (noMatch.length > 0) {
    console.warn(`No match found on Flickr for ${noMatch.length} originals:`);
    noMatch.forEach(original => console.log('  ' + original.name));
  }

  renameFiles(matches);

  console.log('Done');
})();

function renameFiles(matches) {
  if (program.dryRun) {
    console.log('Dry run was specified; will not carry out renames');
  }

  matches.forEach(match => renameFile(match.original, match.flickr));
}

function renameFile(original, flickr) {
  const oldName = original.name;
  const newName = flickr.title + path.extname(oldName);

  console.log(`Rename "${oldName}"   to   "${newName}"`);

  if (program.dryRun) {
    return;
  }

  const newPath = path.join(program.originalsDir, newName);
  fs.renameSync(original.path, newPath);
}

function matchPhotos(originals, onFlickr) {
  const matches = originals.map(original => matchPhoto(original, onFlickr));

  return {
    matches: matches.filter(match => match.flickr),
    noMatch: matches.filter(match => !match.flickr).map(match => match.original),
  };
}

function matchPhoto(original, onFlickr) {
  const originalDateTaken = convertExifDate(original.metadata.exif.DateTimeOriginal);

  const match = onFlickr.find(candidate => candidate.datetaken === originalDateTaken);

  return { original, flickr: match };
}

async function getOriginalFiles() {
  const names = fs.readdirSync(program.originalsDir);

  return Promise.all(
    names.map(async name => {
      const filePath = path.join(program.originalsDir, name);
      const metadata = await getFileExif(filePath);

      return {
        name,
        path: filePath,
        metadata,
      };
    })
  );
}

function convertExifDate(date) {
  // 2019:06:19 15:02:27
  return date.replace(':', '-').replace(':', '-');
}

function getFileExif(path) {
  return new Promise(resolve => {
    new ExifImage({ image: path }, (error, data) => {
      if (error) throw error;

      resolve(data);
    });
  });
}

async function getFlickrPhotos() {
  const user = await call('flickr.people.findByUsername', { username: program.username });
  const set = await call('flickr.photosets.getPhotos', {
    user_id: user.id,
    photoset_id: program.setId,
    extras: 'date_taken',
  });

  console.log('Set: ' + set.title);
  console.log('Photos: ' + set.total);

  if (set.total > set.perpage) {
    console.warn(`Acting on first ${set.perpage} photos only`);
  }

  return set.photo;
}

async function call(method, params) {
  const url = new URL('https://www.flickr.com/services/rest');

  url.search = new URLSearchParams({
    ...params,
    method,
    api_key: program.apiKey,
    format: 'json',
    nojsoncallback: 1,
  });

  return fetch(url).then(handleResponse);
}

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error('Request error: ' + response.statusText);
  }

  const object = await response.json();

  if (object.stat !== 'ok') {
    throw new Error('Unsuccessful call: ' + object.message);
  }

  return object[Object.keys(object)[0]];
}
