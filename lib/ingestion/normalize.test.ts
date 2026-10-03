// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { decodeEntities, stripHtml } from "./normalize";

test("numeric and named entities are decoded (seen raw in Farnam Street's feed)", () => {
  assert.equal(stripHtml("I&#8217;m excited to share this&#160;previously unreleased"), "I’m excited to share this previously unreleased");
  assert.equal(decodeEntities("&#x2019; &laquo;Bonjour&raquo; &hellip; &amp; &eacute;"), "’ «Bonjour» … & &eacute;");
});

test("tags become spaces and whitespace collapses", () => {
  assert.equal(stripHtml("<p>Un <b>budget</b></p>\n\n<p>simple</p>"), "Un budget simple");
});

test("broken or out-of-range entities are left as they are", () => {
  assert.equal(decodeEntities("&#99999999; &#0;"), "&#99999999; &#0;");
});
