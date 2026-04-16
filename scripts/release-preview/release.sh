#!/usr/bin/env bash

printf -v date '%(%F_%H-%M)T'

current_dir="$(dirname $(realpath $0))"
project_dir="$(dirname $(dirname $current_dir))"
release_folder_name="garage-webadmin-prelease-$date"

mkdir -p $current_dir/released/$release_folder_name

rm -rf "$current_dir/released/$release_folder_name/*"

cp -r $project_dir/dist $current_dir/released/$release_folder_name/dist

cp $current_dir/files/** $current_dir/released/$release_folder_name/

cd $current_dir/released/ && zip -r $current_dir/$release_folder_name.zip ./$release_folder_name
