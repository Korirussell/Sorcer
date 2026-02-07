'''
big Braylon 

we are going to need two caches in here...

we will have a method something like: 
'''

#Prompt is the input string
'''
check_hash_cache(prompt):
    hash = hash_ts(prompt)
    if hash in cache:
        return data from cache for this
'''

'''
check_semantic_cache(prmopt):
    vector = vectorize(prompt)
    if vector in vector_db:
        return data from cache

check_if_prompt_is_in_cache(prompt):
    if prompt in either of these two caches, return the saved results

adding new prompts to cache:
     (semantic and hash)   

what are results of cache?
    - depends on system


for input prompt (make all lowercase, punctuation?, whitespace?)
'''
#Thought process ~ Braylon
    #check normal hash first
        #if value the same, return recycled output
        #elif false semantic hash
    #check semantic hash
        #if value close enough(define how close), return recycled output
        #elif call for a new generated response

#What db are we comparing the hash to?

#Application
import os
from core import RedisCache #is this redundant?




#Basics
cache = RedisCache(host="localhost", port=6379, default_ttl=3600)

#Test if exists
if cache.exists("my_key")
    result = cache.get("my_key")

cache.set("my_key", {"data": "value"})

#Semantic Caching
# This uses a local model (all-MiniLM-L6-v2) to turn text into vectors


#Pass through prompt variable
    #input_prompt = 
llmcache = SemanticCache
(
    name="prompt_cache",
    redis_url="redis://localhost:6379", #change this to the actual Redis URL**
    distance_threshold=0.1,  # Lower = must be more similar to "hit"
    vectorizer=HFTextVectorizer("sentence-transformers/all-MiniLM-L6-v2"),
)


