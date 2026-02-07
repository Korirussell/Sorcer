'''
big Braylon 

we are going to need two caches in here...

we will have a method something like: 

check_hash_cache(prompt):
    hash = hash_ts(prompt)
    if hash in cache:
        return data from cache for this


check_semantic_cache(prmopt):
    vector = vectorize(prompt)
    if vector in vector_db:
        return data from cache

check_if_prompt_is_in_cache(prompt):
    if prompt in either of these two caches, return the saved results
'''

