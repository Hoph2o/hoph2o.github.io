import os
import json

def scan_folder(folder_path, output_json):
    # Get list of file names in the directory (excluding subfolders)
    file_names = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]

    # Write the list to a JSON file
    with open(output_json, 'w') as json_file:
        json.dump(file_names, json_file, indent=4)

    print(f"Successfully wrote {len(file_names)} file names to '{output_json}'.")

# === USAGE EXAMPLE ===
if __name__ == "__main__":
    folder_to_scan = r"C:\Users\hoph2\PycharmProjects\Bass Boost\audio"  # <--- change this
    output_json_file = "audio_list.json"  # or give full path if needed
    scan_folder(folder_to_scan, output_json_file)
