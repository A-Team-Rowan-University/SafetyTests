#!/bin/sh

# Copies files to build dir
# Puts JS and CSS into HTML files

rm -r build
mkdir build

echo "Making files Google Scripts compatable"

cp src/client/html/* build/

for i in `ls src/client/js/*`; do
    js=`cat $i`
    filename=`basename $i`

    echo -e\
        "<script>\n"\
        "$js\n"\
        "</script>\n"\
    > build/$filename.html
done

for i in `ls src/client/css/*`; do
    css=`cat $i`
    filename=`basename $i`

    echo -e\
        "<style>\n"\
        "$css\n"\
        "</style>\n"\
    > build/$filename.html
done


cp src/server/* build/


if [ "$1" = "deploy" ]; then
    gapps upload
fi
