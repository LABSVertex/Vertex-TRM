import os
import stat
import shutil
import subprocess
import time

def run(cmd):
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        raise Exception(f"Failed: {cmd}")

def remove_readonly(func, path, _):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def kill_git_locks(repo_path):
    lock_file = os.path.join(repo_path, ".git", "index.lock")
    if os.path.exists(lock_file):
        os.remove(lock_file)

def wipe_git(repo_path):
    git_folder = os.path.join(repo_path, ".git")

    if not os.path.exists(git_folder):
        return

    kill_git_locks(repo_path)

    for _ in range(3):
        try:
            shutil.rmtree(git_folder, onerror=remove_readonly)
            return
        except:
            time.sleep(1)

    raise Exception("Could not delete .git folder. Close VSCode/GitHub Desktop first.")

def main():
    print("=== Repo Nuclear Wiper ===\n")

    repo_path = input("Repo folder path: ").strip().strip('"')
    repo_url = input("GitHub repo URL: ").strip()

    os.chdir(repo_path)

    print("Deleting old git history...")
    wipe_git(repo_path)

    print("Fresh init...")
    run("git init")
    run("git branch -M main")
    run(f'git remote add origin "{repo_url}"')

    print("Adding files...")
    run("git add .")

    print("Committing...")
    run('git commit -m "Initial commit"')

    print("Force pushing...")
    run("git push -u --force origin main")

    print("\nDone. Repo wiped clean.")

if __name__ == "__main__":
    main()