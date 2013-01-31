/*
 * ZestJS
 * http://zestjs.org
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * Main Zest bundle
 * Includes the render, escape, component and zoe parts.
 *
 * To just load rendering on its own, use 'zest/zest-render'.
 * 
 * $z.Component is dependent on the inheritance framework ZOE (~6KB).
 * A bundle excluding this could be used to implement a different inheritance framework.
 *
 * http://zestjs.org
 * 
 */
define(['zoe', 'is!browser?./zest-render', './escape', './component', 'css', 'json/json'], function(zoe, $z, escape, Component) {
  $z = $z || {};
  //component adds zoe onto $z
  $z.Component = Component;
  $z.esc = escape;
  if (!$z.fn)
    zoe.extend($z, zoe);
  return $z;
});
