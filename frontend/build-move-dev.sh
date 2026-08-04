bun run build

rm -r ../backend/public
mkdir -p ../backend/public
cp -r dist/* ../backend/public/
