---
title: Smoke
description: |
  %% tabs %%
  %% tab: Metadata literal A %%
  %% tab: Metadata literal B %%
  %% endtabs %%
---

````tabsdown
config: position=top, layout=multi, density=compact, personality=separator, palette=secondary, alignment=center

tab: icon:code **Outer**

A [[target|fenced wikilink]] and a ==fenced highlight==.

> [!note] Fenced callout
> Fenced callout body.

[Fenced reference][shared]

[outer-ref]: https://example.test/outer "Outer panel"

```tabsdown
tab: Inner A
[Inherited nested reference][outer-ref]
tab: Inner B
```

%% tabs %%
%% tab: Marker in fence A %%
Nested marker body.

```tabsdown
tab: Deep inherited A
[Deep inherited reference][outer-ref]
tab: Deep inherited B
```
%% tab: Marker in fence B %%
%% endtabs %%

tab: [Second](https://example.test) <img src=x>
````

<!-- prettier-ignore -->
$$$
%% tabs %%
%% tab: Math literal A %%
%% tab: Math literal B %%
%% endtabs %%
x^2
$$$$

Before $start
%% tabs %%
%% tab: Inline math literal A %%
%% tab: Inline math literal B %%
%% endtabs %%
end$ after

%% tabs %%
%% config: position=left, layout=multi %%
%% tab: icon:book **First** %%
A [[target|marker wikilink]] and a ==marker highlight==.

> [!tip] Marker callout
> Marker callout body.

[Marker reference][shared]

```tabsdown
tab: Fence in marker A
tab: Fence in marker B
```

%% tabs %%
%% tab: Nested marker A %%
Nested marker content.
%% tab: Nested marker B %%
%% endtabs %%
%% tab: Second %%
More marker content.
%% endtabs %%

- Container list

  %% tabs %%
  %% tab: List A %%
  List panel body.
  %% tab: List B %%
  %% endtabs %%

  %% tabs %%
  %% tab: List sibling A %%
  List sibling body.
  %% tab: List sibling B %%
  %% endtabs %%

> %% tabs %%
> %% tab: Quote A %%
> Quote panel body.
> %% tab: Quote B %%
> %% endtabs %%
>
> %% tabs %%
> %% tab: Quote sibling A %%
> Quote sibling body.
> %% tab: Quote sibling B %%
> %% endtabs %%
>
> ```text
> %% tabs %%
> %% tab: Quoted literal A %%
> %% tab: Quoted literal B %%
> %% endtabs %%
> ```

100. Ordered container

     %% tabs %%
     %% tab: Ordered A %%
     Ordered panel body.
     %% tab: Ordered B %%
     %% endtabs %%

%% ordinary-comment-must-disappear %%

```text
%% tabs %%
%% tab: Literal A %%
%% tab: Literal B %%
%% endtabs %%
```

[shared]: https://example.test/shared "Document reference"

%% tabs %%
%% tab: Label `%%
%% tab: Other label %%
Body`.
%% endtabs %%

[Literal title link][literal-title]

<!-- prettier-ignore -->
[literal-title]: https://example.test/title "Literal title
%% tabs %%
%% tab: Title literal A %%
%% tab: Title literal B %%
%% endtabs %%
End title"
